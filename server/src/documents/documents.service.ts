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
  ValidateBusinessDocumentDto,
} from './dto/document.dto';

const documentInclude = {
  company: { select: { id: true, name: true, email: true, photoUrl: true, documentFooter: true } },
  event: { select: { id: true, title: true, startsAt: true, status: true } },
  client: { select: { id: true, name: true, contactName: true, email: true, phone: true } },
  subjectUser: { select: { id: true, firstName: true, lastName: true, email: true } },
  uploadedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  validatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
};

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
    return this.prisma.businessDocument.findMany({
      include: documentInclude,
      orderBy: { createdAt: 'desc' },
      take: 150,
    });
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

  async generate(user: AuthenticatedUser, dto: GenerateBusinessDocumentDto) {
    await this.ensureScopeTarget(dto.scope, dto);
    const company = await this.prisma.company.findFirst();
    const pdfText = await this.buildDocumentText(dto);

    return this.create(user, {
      scope: dto.scope,
      eventId: dto.eventId,
      clientId: dto.clientId,
      userId: dto.userId,
      type: dto.type,
      label: dto.label,
      url: this.toPdfDataUrl(pdfText),
      fileName: `${dto.label.trim().replace(/\s+/g, '-').toLowerCase()}.pdf`,
      mimeType: 'application/pdf',
      templateName: dto.templateName ?? 'Modele M Group',
      logoIncluded: true,
      status: BusinessDocumentStatus.PENDING_VALIDATION,
      notes: [company?.documentFooter, dto.notes].filter(Boolean).join(' - '),
    });
  }

  private async buildDocumentText(dto: GenerateBusinessDocumentDto) {
    const [company, event, client, user] = await Promise.all([
      this.prisma.company.findFirst(),
      dto.eventId ? this.prisma.event.findUnique({ where: { id: dto.eventId } }) : null,
      dto.clientId ? this.prisma.commercialClient.findUnique({ where: { id: dto.clientId } }) : null,
      dto.userId ? this.prisma.user.findUnique({ where: { id: dto.userId } }) : null,
    ]);

    return [
      company?.name ?? 'M Group',
      `Document : ${dto.label}`,
      `Type : ${dto.type}`,
      `Modele : ${dto.templateName ?? 'Modele M Group avec logo'}`,
      client ? `Client : ${client.name}` : '',
      event ? `Evenement : ${event.title}` : '',
      user ? `Utilisateur : ${user.lastName} ${user.firstName}` : '',
      dto.amountFcfa ? `Montant : ${dto.amountFcfa} FCFA` : '',
      dto.notes ? `Notes : ${dto.notes}` : '',
      company?.documentFooter ?? 'Document genere par M Group.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private toPdfDataUrl(content: string) {
    // PDF minimal compatible prototype : le stockage reel viendra avec un service de generation PDF dedie.
    const escaped = content.replace(/[()\\]/g, '\\$&').replace(/\r?\n/g, ') Tj 0 -16 Td (');
    const stream = `BT /F1 12 Tf 40 760 Td (${escaped}) Tj ET`;
    const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length ${stream.length} >> stream
${stream}
endstream endobj
trailer << /Root 1 0 R >>
%%EOF`;

    return `data:application/pdf;base64,${Buffer.from(pdf).toString('base64')}`;
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
