import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  CommercialQuoteStatus,
  CommercialStatus,
  NotificationType,
  Prisma,
  RoleName,
  ServiceRequestStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateClientDto,
  CreateExchangeDto,
  CreateQuoteDto,
  CreateServiceRequestDto,
  UpdateClientDto,
  UpdateQuoteDto,
  UpdateServiceRequestDto,
} from './dto/commercial.dto';

const commercialClientInclude = {
  owner: {
    select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
  },
  serviceRequests: {
    include: {
      event: { select: { id: true, title: true, startsAt: true, status: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  quotes: {
    orderBy: { createdAt: 'desc' as const },
  },
  exchanges: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { exchangedAt: 'desc' as const },
  },
};

@Injectable()
export class CommercialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async overview() {
    const [clients, requests, quotes] = await Promise.all([
      this.prisma.commercialClient.findMany({
        include: commercialClientInclude,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.serviceRequest.findMany({
        include: {
          client: { select: { id: true, name: true, status: true } },
          event: { select: { id: true, title: true, startsAt: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.commercialQuote.findMany({
        include: {
          client: { select: { id: true, name: true, status: true } },
          request: { select: { id: true, title: true, status: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const acceptedQuotes = quotes.filter((quote) => quote.status === CommercialQuoteStatus.ACCEPTED);
    const activeClientStatuses: CommercialStatus[] = [CommercialStatus.NEW, CommercialStatus.IN_DISCUSSION];
    const openRequestStatuses: ServiceRequestStatus[] = [
      ServiceRequestStatus.NEW,
      ServiceRequestStatus.IN_DISCUSSION,
      ServiceRequestStatus.QUOTED,
    ];

    return {
      totals: {
        clients: clients.length,
        prospects: clients.filter((client) => activeClientStatuses.includes(client.status)).length,
        wonClients: clients.filter((client) => client.status === CommercialStatus.WON).length,
        lostClients: clients.filter((client) => client.status === CommercialStatus.LOST).length,
        openRequests: requests.filter((request) => openRequestStatuses.includes(request.status)).length,
        acceptedQuotes: acceptedQuotes.length,
        revenueFcfa: acceptedQuotes.reduce((total, quote) => total + quote.amountFcfa, 0),
      },
      clients,
      requests,
      quotes,
      pipeline: this.buildPipeline(clients),
    };
  }

  async clients() {
    return this.prisma.commercialClient.findMany({
      include: commercialClientInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createClient(user: AuthenticatedUser, dto: CreateClientDto) {
    const company = await this.prisma.company.findFirst();

    // Le client commercial est rattache au commercial connecte pour garder la responsabilite claire.
    const client = await this.prisma.commercialClient.create({
      data: {
        companyId: company?.id,
        ownerId: user.sub,
        name: dto.name.trim(),
        contactName: this.clean(dto.contactName),
        email: this.clean(dto.email),
        phone: this.clean(dto.phone),
        address: this.clean(dto.address),
        source: this.clean(dto.source),
        status: dto.status ?? CommercialStatus.NEW,
        notes: this.clean(dto.notes),
      },
      include: commercialClientInclude,
    });

    await this.audit(user, AuditAction.CLIENT_CREATED, { clientId: client.id, name: client.name });
    await this.notifyAdmins('Nouveau client commercial', `${client.name} a ete ajoute au pipeline.`, {
      clientId: client.id,
    });

    return client;
  }

  async updateClient(clientId: string, user: AuthenticatedUser, dto: UpdateClientDto) {
    await this.ensureClientExists(clientId);

    const client = await this.prisma.commercialClient.update({
      where: { id: clientId },
      data: {
        name: this.clean(dto.name),
        contactName: this.clean(dto.contactName),
        email: this.clean(dto.email),
        phone: this.clean(dto.phone),
        address: this.clean(dto.address),
        source: this.clean(dto.source),
        status: dto.status,
        notes: this.clean(dto.notes),
      },
      include: commercialClientInclude,
    });

    if (dto.status) {
      await this.audit(user, AuditAction.QUOTE_STATUS_UPDATED, { clientId, status: dto.status });
    }

    return client;
  }

  async removeClient(clientId: string, user: AuthenticatedUser) {
    const client = await this.prisma.commercialClient.findUnique({ where: { id: clientId } });

    if (!client) {
      throw new NotFoundException('Client not found.');
    }

    // La suppression client nettoie les demandes, devis et echanges grace aux relations en cascade.
    await this.prisma.commercialClient.delete({ where: { id: clientId } });
    await this.audit(user, AuditAction.CLIENT_CREATED, { clientId, name: client.name, deleted: true });

    return this.overview();
  }

  async createRequest(user: AuthenticatedUser, dto: CreateServiceRequestDto) {
    await this.ensureClientExists(dto.clientId);

    if (dto.eventId) {
      await this.ensureEventExists(dto.eventId);
    }

    const request = await this.prisma.serviceRequest.create({
      data: {
        clientId: dto.clientId,
        eventId: this.clean(dto.eventId),
        ownerId: user.sub,
        title: dto.title.trim(),
        description: this.clean(dto.description),
        expectedBudgetFcfa: dto.expectedBudgetFcfa,
        status: dto.status ?? ServiceRequestStatus.NEW,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });

    await this.audit(user, AuditAction.SERVICE_REQUEST_CREATED, {
      requestId: request.id,
      clientId: dto.clientId,
    });
    await this.notifyRoles([RoleName.ADMIN, RoleName.COMPTABLE], 'Nouvelle demande commerciale', `${request.title} attend un suivi commercial.`, {
      requestId: request.id,
      clientId: dto.clientId,
    });

    return this.overview();
  }

  async updateRequest(requestId: string, user: AuthenticatedUser, dto: UpdateServiceRequestDto) {
    await this.ensureRequestExists(requestId);

    if (dto.eventId) {
      await this.ensureEventExists(dto.eventId);
    }

    await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        eventId: this.clean(dto.eventId),
        title: this.clean(dto.title),
        description: this.clean(dto.description),
        expectedBudgetFcfa: dto.expectedBudgetFcfa,
        status: dto.status,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });

    await this.audit(user, AuditAction.SERVICE_REQUEST_CREATED, { requestId, updated: true });
    return this.overview();
  }

  async removeRequest(requestId: string, user: AuthenticatedUser) {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id: requestId } });

    if (!request) {
      throw new NotFoundException('Service request not found.');
    }

    await this.prisma.serviceRequest.delete({ where: { id: requestId } });
    await this.audit(user, AuditAction.SERVICE_REQUEST_CREATED, { requestId, deleted: true });

    return this.overview();
  }

  async createQuote(user: AuthenticatedUser, dto: CreateQuoteDto) {
    await this.ensureClientExists(dto.clientId);

    if (dto.requestId) {
      await this.ensureRequestExists(dto.requestId);
    }

    if (dto.eventId) {
      await this.ensureEventExists(dto.eventId);
    }

    const quote = await this.prisma.commercialQuote.create({
      data: {
        clientId: dto.clientId,
        requestId: this.clean(dto.requestId),
        eventId: this.clean(dto.eventId),
        createdById: user.sub,
        quoteNumber: await this.nextQuoteNumber(),
        title: dto.title.trim(),
        amountFcfa: dto.amountFcfa,
        status: dto.status ?? CommercialQuoteStatus.DRAFT,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: this.clean(dto.notes),
      },
    });

    if (dto.requestId) {
      await this.prisma.serviceRequest.update({
        where: { id: dto.requestId },
        data: { status: ServiceRequestStatus.QUOTED },
      });
    }

    await this.audit(user, AuditAction.QUOTE_CREATED, {
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber,
      amountFcfa: quote.amountFcfa,
    });
    await this.notifyAdmins('Nouveau devis commercial', `${quote.quoteNumber} - ${quote.title} a ete cree.`, {
      quoteId: quote.id,
      amountFcfa: quote.amountFcfa,
    });

    return this.overview();
  }

  async updateQuote(quoteId: string, user: AuthenticatedUser, dto: UpdateQuoteDto) {
    await this.ensureQuoteExists(quoteId);

    const quote = await this.prisma.commercialQuote.update({
      where: { id: quoteId },
      data: {
        title: this.clean(dto.title),
        amountFcfa: dto.amountFcfa,
        status: dto.status,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        notes: this.clean(dto.notes),
      },
    });

    if (dto.status === CommercialQuoteStatus.ACCEPTED || dto.status === CommercialQuoteStatus.REJECTED) {
      const status = dto.status === CommercialQuoteStatus.ACCEPTED ? ServiceRequestStatus.WON : ServiceRequestStatus.LOST;

      if (quote.requestId) {
        await this.prisma.serviceRequest.update({
          where: { id: quote.requestId },
          data: { status },
        });
      }

      await this.prisma.commercialClient.update({
        where: { id: quote.clientId },
        data: { status: dto.status === CommercialQuoteStatus.ACCEPTED ? CommercialStatus.WON : CommercialStatus.LOST },
      });
    }

    await this.audit(user, AuditAction.QUOTE_STATUS_UPDATED, { quoteId, status: dto.status ?? quote.status });
    return this.overview();
  }

  async removeQuote(quoteId: string, user: AuthenticatedUser) {
    const quote = await this.prisma.commercialQuote.findUnique({ where: { id: quoteId } });

    if (!quote) {
      throw new NotFoundException('Quote not found.');
    }

    await this.prisma.commercialQuote.delete({ where: { id: quoteId } });
    await this.audit(user, AuditAction.QUOTE_STATUS_UPDATED, {
      quoteId,
      quoteNumber: quote.quoteNumber,
      deleted: true,
    });

    return this.overview();
  }

  async createExchange(user: AuthenticatedUser, dto: CreateExchangeDto) {
    await this.ensureClientExists(dto.clientId);

    const exchange = await this.prisma.clientExchange.create({
      data: {
        clientId: dto.clientId,
        userId: user.sub,
        channel: dto.channel.trim(),
        subject: this.clean(dto.subject),
        notes: dto.notes.trim(),
        exchangedAt: dto.exchangedAt ? new Date(dto.exchangedAt) : new Date(),
      },
    });

    await this.audit(user, AuditAction.CLIENT_EXCHANGE_CREATED, {
      clientId: dto.clientId,
      exchangeId: exchange.id,
      channel: exchange.channel,
    });

    return this.overview();
  }

  private buildPipeline(clients: { status: CommercialStatus }[]) {
    return Object.values(CommercialStatus).map((status) => ({
      status,
      count: clients.filter((client) => client.status === status).length,
    }));
  }

  private async nextQuoteNumber() {
    const year = new Date().getFullYear();
    const count = await this.prisma.commercialQuote.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
        },
      },
    });

    return `MG-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private async ensureClientExists(clientId: string) {
    const count = await this.prisma.commercialClient.count({ where: { id: clientId } });

    if (count === 0) {
      throw new NotFoundException('Client not found.');
    }
  }

  private async ensureRequestExists(requestId: string) {
    const count = await this.prisma.serviceRequest.count({ where: { id: requestId } });

    if (count === 0) {
      throw new NotFoundException('Service request not found.');
    }
  }

  private async ensureQuoteExists(quoteId: string) {
    const count = await this.prisma.commercialQuote.count({ where: { id: quoteId } });

    if (count === 0) {
      throw new NotFoundException('Quote not found.');
    }
  }

  private async ensureEventExists(eventId: string) {
    const count = await this.prisma.event.count({ where: { id: eventId } });

    if (count === 0) {
      throw new NotFoundException('Event not found.');
    }
  }

  private async notifyAdmins(title: string, message: string, metadata: Record<string, string | number | boolean | null>) {
    return this.notifyRoles([RoleName.ADMIN], title, message, metadata);
  }

  private async notifyRoles(
    roles: RoleName[],
    title: string,
    message: string,
    metadata: Record<string, string | number | boolean | null>,
  ) {
    await this.notifications.notifyRoles(roles, {
      type: NotificationType.COMMERCIAL_UPDATED,
      title,
      message,
      channels: ['IN_APP', 'EMAIL', 'SOUND'],
      actionUrl: '#commercial',
      metadata,
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
