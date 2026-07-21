import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  BusinessDocumentScope,
  BusinessDocumentStatus,
  NotificationType,
  Prisma,
  RoleName,
} from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBusinessDocumentDto,
  GenerateBusinessDocumentDto,
  UpdateBusinessDocumentDto,
  ValidateBusinessDocumentDto,
} from './dto/document.dto';

const documentInclude = {
  company: { select: { id: true, name: true, email: true, photoUrl: true, documentFooter: true } },
  event: { select: { id: true, title: true, startsAt: true, status: true } },
  client: { select: { id: true, name: true, contactName: true, email: true, phone: true } },
  subjectUser: { select: { id: true, firstName: true, lastName: true, email: true } },
  uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  validatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;

type BusinessDocumentRecord = Prisma.BusinessDocumentGetPayload<{ include: typeof documentInclude }>;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async overview() {
    const documents = await this.list();

    const approvedStatuses: BusinessDocumentStatus[] = [
      BusinessDocumentStatus.APPROVED,
      BusinessDocumentStatus.SIGNED,
    ];

    return {
      totals: {
        documents: documents.length,
        pendingValidation: documents.filter((document) => document.status === BusinessDocumentStatus.PENDING_VALIDATION)
          .length,
        approved: documents.filter((document) => approvedStatuses.includes(document.status)).length,
        archived: documents.filter((document) => document.status === BusinessDocumentStatus.ARCHIVED).length,
      },
      byScope: Object.values(BusinessDocumentScope).map((scope) => ({
        scope,
        count: documents.filter((document) => document.scope === scope).length,
      })),
      documents,
    };
  }

  async list() {
    const documents = await this.prisma.businessDocument.findMany({
      include: documentInclude,
      orderBy: { createdAt: 'desc' },
      take: 150,
    });

    return documents.map((document) => this.withOpenableGeneratedPdf(document));
  }

  async create(user: AuthenticatedUser, dto: CreateBusinessDocumentDto) {
    await this.ensureScopeTarget(dto.scope, dto);
    const company = await this.prisma.company.findFirst();

    // Le fichier est stocke ici sous forme d'URL ou de Data URL pour le prototype.
    // En production, cette valeur devra pointer vers un stockage prive type S3/MinIO.
    const document = await this.prisma.businessDocument.create({
      data: {
        companyId: company?.id,
        eventId: this.clean(dto.eventId),
        clientId: this.clean(dto.clientId),
        userId: this.clean(dto.userId),
        uploadedById: user.sub,
        scope: dto.scope,
        label: dto.label.trim(),
        url: dto.url,
        type: dto.type,
        status: dto.status ?? BusinessDocumentStatus.PENDING_VALIDATION,
        fileName: this.clean(dto.fileName),
        mimeType: this.clean(dto.mimeType),
        sizeBytes: dto.sizeBytes,
        checksum: this.clean(dto.checksum),
        templateName: this.clean(dto.templateName),
        logoIncluded: dto.logoIncluded ?? true,
        notes: this.clean(dto.notes),
      },
      include: documentInclude,
    });

    await this.audit(user, AuditAction.DOCUMENT_CREATED, { documentId: document.id, scope: document.scope });

    if (document.status === BusinessDocumentStatus.PENDING_VALIDATION) {
      await this.notifyDocumentPending(document.id, document.label);
    }

    return document;
  }

  async validate(documentId: string, user: AuthenticatedUser, dto: ValidateBusinessDocumentDto) {
    await this.ensureDocumentExists(documentId);

    const document = await this.prisma.businessDocument.update({
      where: { id: documentId },
      data: {
        status: dto.status,
        notes: this.clean(dto.notes),
        validatedById: user.sub,
        validatedAt: new Date(),
      },
      include: documentInclude,
    });

    await this.audit(user, AuditAction.DOCUMENT_VALIDATED, {
      documentId,
      status: document.status,
    });

    return document;
  }

  async update(documentId: string, user: AuthenticatedUser, dto: UpdateBusinessDocumentDto) {
    const current = await this.findDocument(documentId);
    await this.ensureScopeTarget(current.scope, {
      eventId: dto.eventId ?? current.eventId ?? undefined,
      clientId: dto.clientId ?? current.clientId ?? undefined,
      userId: dto.userId ?? current.userId ?? undefined,
    });

    const document = await this.prisma.businessDocument.update({
      where: { id: documentId },
      data: {
        eventId: this.clean(dto.eventId),
        clientId: this.clean(dto.clientId),
        userId: this.clean(dto.userId),
        label: this.clean(dto.label),
        url: this.clean(dto.url),
        type: dto.type,
        status: dto.status,
        fileName: this.clean(dto.fileName),
        mimeType: this.clean(dto.mimeType),
        templateName: this.clean(dto.templateName),
        logoIncluded: dto.logoIncluded,
        notes: this.clean(dto.notes),
      },
      include: documentInclude,
    });

    await this.audit(user, AuditAction.DOCUMENT_CREATED, {
      documentId,
      updated: true,
      status: document.status,
    });

    return this.withOpenableGeneratedPdf(document);
  }

  async remove(documentId: string, user: AuthenticatedUser) {
    const document = await this.findDocument(documentId);

    await this.prisma.businessDocument.delete({ where: { id: documentId } });
    await this.audit(user, AuditAction.DOCUMENT_CREATED, {
      documentId,
      label: document.label,
      deleted: true,
    });

    return this.overview();
  }

  async generate(user: AuthenticatedUser, dto: GenerateBusinessDocumentDto) {
    await this.ensureScopeTarget(dto.scope, dto);
    const company = await this.prisma.company.findFirst();
    const reference = await this.nextDocumentNumber(dto.type);
    const normalizedLabel = `${reference} - ${dto.label.trim()}`;
    const pdfText = await this.buildDocumentText(dto, reference);

    return this.create(user, {
      scope: dto.scope,
      eventId: dto.eventId,
      clientId: dto.clientId,
      userId: dto.userId,
      type: dto.type,
      label: normalizedLabel,
      url: this.toPdfDataUrl(pdfText),
      fileName: `${reference}-${this.slugify(dto.label)}.pdf`,
      mimeType: 'application/pdf',
      templateName: dto.templateName ?? 'Modele M Group',
      logoIncluded: true,
      status: BusinessDocumentStatus.PENDING_VALIDATION,
      notes: [`Reference : ${reference}`, company?.documentFooter, dto.notes].filter(Boolean).join(' - '),
    });
  }

  private async buildDocumentText(dto: GenerateBusinessDocumentDto, reference: string) {
    const [company, event, client, user] = await Promise.all([
      this.prisma.company.findFirst(),
      dto.eventId ? this.prisma.event.findUnique({ where: { id: dto.eventId } }) : null,
      dto.clientId ? this.prisma.commercialClient.findUnique({ where: { id: dto.clientId } }) : null,
      dto.userId ? this.prisma.user.findUnique({ where: { id: dto.userId } }) : null,
    ]);

    return [
      `Reference : ${reference}`,
      `Entreprise : ${company?.name ?? 'M Group'}`,
      `Document : ${dto.label.trim()}`,
      `Type : ${this.documentTypeLabel(dto.type)}`,
      `Modele : ${dto.templateName ?? 'Modele M Group avec logo'}`,
      `Date : ${new Date().toLocaleDateString('fr-FR')}`,
      client ? `Client : ${client.name}` : '',
      event ? `Evenement : ${event.title}` : '',
      user ? `Utilisateur : ${user.lastName} ${user.firstName}` : '',
      dto.amountFcfa ? `Montant : ${dto.amountFcfa} FCFA` : '',
      dto.notes ? `Notes : ${dto.notes}` : '',
      'Validation interne : document a valider avant envoi externe.',
      'Signature : Direction M Group',
      company?.documentFooter ?? 'Document genere par M Group.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildStoredDocumentText(document: BusinessDocumentRecord) {
    return [
      document.company?.name ?? 'M Group',
      `Document : ${document.label}`,
      `Type : ${this.documentTypeLabel(document.type)}`,
      `Statut : ${document.status}`,
      `Modele : ${document.templateName ?? 'Modele M Group avec logo'}`,
      document.client ? `Client : ${document.client.name}` : '',
      document.event ? `Evenement : ${document.event.title}` : '',
      document.subjectUser ? `Utilisateur : ${document.subjectUser.lastName} ${document.subjectUser.firstName}` : '',
      document.notes ? `Notes : ${document.notes}` : '',
      document.company?.documentFooter ?? 'Document genere par M Group.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private withOpenableGeneratedPdf(document: BusinessDocumentRecord) {
    const isGeneratedPdf =
      document.mimeType === 'application/pdf' &&
      document.templateName &&
      document.url.startsWith('data:application/pdf');

    if (!isGeneratedPdf) {
      return document;
    }

    // Les anciens documents generes etaient des PDF trop minimaux pour certains navigateurs.
    // On renvoie donc une URL PDF reconstruite avec une structure PDF complete.
    return {
      ...document,
      url: this.toPdfDataUrl(this.buildStoredDocumentText(document)),
    };
  }

  private toPdfDataUrl(content: string) {
    return `data:application/pdf;base64,${this.toPdfBuffer(content).toString('base64')}`;
  }

  private toPdfBuffer(content: string) {
    const lines = this.toPdfLines(content);
    const title = lines[0] ?? 'Document M Group';
    const body = lines.slice(1);
    const bodyCommands = body
      .map((line, index) => `BT /F1 10 Tf 72 ${665 - index * 18} Td (${this.escapePdfText(line)}) Tj ET`)
      .join('\n');
    const stream = `q
0.02 0.03 0.05 rg
0 0 595 842 re f
Q
q
0.95 0.97 1 rg
46 716 503 78 re f
Q
q
1 0.48 0.1 rg
66 742 44 34 re f
Q
q
1 1 1 rg
BT /F2 24 Tf 78 749 Td (M) Tj ET
Q
q
0.07 0.14 0.25 rg
BT /F2 19 Tf 126 761 Td (M GROUP) Tj ET
BT /F1 10 Tf 126 744 Td (Document professionnel avec logo et validation interne) Tj ET
Q
q
1 0.48 0.1 rg
46 698 503 4 re f
Q
q
1 1 1 rg
BT /F2 22 Tf 72 672 Td (${this.escapePdfText(title)}) Tj ET
Q
q
0.85 0.9 0.97 rg
46 104 503 528 re f
Q
q
0.07 0.14 0.25 rg
${bodyCommands}
Q
q
1 0.48 0.1 rg
72 92 160 1.5 re f
Q
q
0.95 0.97 1 rg
BT /F2 11 Tf 72 72 Td (Signature et validation interne M Group) Tj ET
BT /F1 9 Tf 72 56 Td (Ce document doit etre valide selon le workflow interne avant diffusion externe.) Tj ET
Q`;
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
      `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>
stream
${stream}
endstream`,
    ];
    let pdf = '%PDF-1.4\n';
    const objectOffsets: number[] = [];

    objects.forEach((body, index) => {
      objectOffsets.push(Buffer.byteLength(pdf, 'ascii'));
      pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf, 'ascii');
    const xrefEntries = objectOffsets
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
      .join('\n');
    pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f
${xrefEntries}
trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF
`;

    return Buffer.from(pdf, 'ascii');
  }

  private toPdfLines(content: string) {
    return content
      .split(/\r?\n/)
      .flatMap((line) => {
        const safeLine = this.toPdfSafeText(line);

        if (safeLine.length <= 88) {
          return [safeLine || ' '];
        }

        const chunks: string[] = [];
        for (let index = 0; index < safeLine.length; index += 88) {
          chunks.push(safeLine.slice(index, index + 88));
        }

        return chunks;
      })
      .slice(0, 28);
  }

  private async findDocument(documentId: string) {
    const document = await this.prisma.businessDocument.findUnique({
      where: { id: documentId },
      include: documentInclude,
    });

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    return document;
  }

  private async nextDocumentNumber(type: GenerateBusinessDocumentDto['type']) {
    const year = new Date().getFullYear();
    const prefix = this.documentPrefix(type);
    const count = await this.prisma.businessDocument.count({
      where: {
        type,
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        },
      },
    });

    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private documentPrefix(type: GenerateBusinessDocumentDto['type']) {
    const prefixes: Record<string, string> = {
      QUOTE: 'DEV',
      INVOICE: 'FAC',
      RECEIPT: 'REC',
      CONTRACT: 'CTR',
      REPORT: 'RAP',
      TECHNICAL_SHEET: 'TEC',
      ADMINISTRATIVE: 'ADM',
      PHOTO: 'IMG',
      OTHER: 'DOC',
    };

    return prefixes[type] ?? 'DOC';
  }

  private documentTypeLabel(type: GenerateBusinessDocumentDto['type']) {
    const labels: Record<string, string> = {
      QUOTE: 'Devis',
      INVOICE: 'Facture',
      RECEIPT: 'Recu',
      CONTRACT: 'Contrat',
      TECHNICAL_SHEET: 'Fiche technique',
      PHOTO: 'Photo',
      ADMINISTRATIVE: 'Administratif',
      REPORT: 'Rapport',
      OTHER: 'Document',
    };

    return labels[type] ?? type;
  }

  private slugify(value: string) {
    return this.toPdfSafeText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
  }

  private toPdfSafeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapePdfText(value: string) {
    return this.toPdfSafeText(value).replace(/[()\\]/g, '\\$&');
  }

  private async ensureScopeTarget(
    scope: BusinessDocumentScope,
    dto: { eventId?: string; clientId?: string; userId?: string },
  ) {
    if (scope === BusinessDocumentScope.EVENT) {
      if (!dto.eventId) {
        throw new BadRequestException('eventId is required for event documents.');
      }
      return this.ensureEventExists(dto.eventId);
    }

    if (scope === BusinessDocumentScope.CLIENT) {
      if (!dto.clientId) {
        throw new BadRequestException('clientId is required for client documents.');
      }
      return this.ensureClientExists(dto.clientId);
    }

    if (scope === BusinessDocumentScope.USER) {
      if (!dto.userId) {
        throw new BadRequestException('userId is required for user documents.');
      }
      return this.ensureUserExists(dto.userId);
    }
  }

  private async ensureDocumentExists(documentId: string) {
    const count = await this.prisma.businessDocument.count({ where: { id: documentId } });

    if (count === 0) {
      throw new NotFoundException('Document not found.');
    }
  }

  private async ensureEventExists(eventId: string) {
    const count = await this.prisma.event.count({ where: { id: eventId } });

    if (count === 0) {
      throw new NotFoundException('Event not found.');
    }
  }

  private async ensureClientExists(clientId: string) {
    const count = await this.prisma.commercialClient.count({ where: { id: clientId } });

    if (count === 0) {
      throw new NotFoundException('Client not found.');
    }
  }

  private async ensureUserExists(userId: string) {
    const count = await this.prisma.user.count({ where: { id: userId } });

    if (count === 0) {
      throw new NotFoundException('User not found.');
    }
  }

  private async notifyDocumentPending(documentId: string, label: string) {
    await this.notifications.notifyRoles([RoleName.ADMIN], {
      type: NotificationType.DOCUMENT_PENDING,
      title: 'Document en attente de validation',
      message: `${label} attend une validation interne.`,
      channels: ['IN_APP', 'EMAIL', 'SOUND'],
      actionUrl: '#documents',
      metadata: { documentId },
    });
  }

  private async audit(actor: AuthenticatedUser, action: AuditAction, metadata: Prisma.InputJsonObject) {
    await this.prisma.loginAuditLog.create({
      data: {
        userId: actor.sub,
        action,
        metadata,
      },
    });
  }

  private clean(value?: string) {
    return value === undefined ? undefined : value.trim();
  }
}
