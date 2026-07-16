import { Injectable } from '@nestjs/common';
import {
  AuditAction,
  CommercialQuoteStatus,
  CommercialStatus,
  EventStatus,
  NotificationType,
  Prisma,
  ReportExportFormat,
} from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExportReportDto, ReportPeriodDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async summary(dto: ReportPeriodDto = {}) {
    const range = this.buildRange(dto);
    const [quotes, events, expenses, users, exports] = await Promise.all([
      this.prisma.commercialQuote.findMany({
        where: { createdAt: range },
        include: { client: { select: { id: true, name: true, status: true } } },
      }),
      this.prisma.event.findMany({
        where: { startsAt: range },
        include: {
          budgets: true,
          expenses: true,
          payments: true,
        },
      }),
      this.prisma.eventExpense.findMany({ where: { spentAt: range } }),
      this.prisma.user.findMany({
        where: { lastLoginAt: range },
        select: { id: true, firstName: true, lastName: true, email: true, lastLoginAt: true },
      }),
      this.prisma.reportExport.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);

    const acceptedQuotes = quotes.filter((quote) => quote.status === CommercialQuoteStatus.ACCEPTED);
    const pendingQuoteStatuses: CommercialQuoteStatus[] = [
      CommercialQuoteStatus.DRAFT,
      CommercialQuoteStatus.SENT,
    ];
    const completedEvents = events.filter((event) => event.status === EventStatus.COMPLETED);
    const consumedBudgetFcfa = expenses.reduce((total, expense) => total + expense.amountFcfa, 0);
    const plannedBudgetFcfa = events.reduce(
      (total, event) =>
        total +
        event.budgets.reduce((budgetTotal, budget) => budgetTotal + budget.plannedAmountFcfa, 0),
      0,
    );

    return {
      period: {
        start: dto.periodStart ?? null,
        end: dto.periodEnd ?? null,
      },
      totals: {
        revenueFcfa: acceptedQuotes.reduce((total, quote) => total + quote.amountFcfa, 0),
        completedEvents: completedEvents.length,
        eventsTotal: events.length,
        plannedBudgetFcfa,
        consumedBudgetFcfa,
        budgetConsumptionRate: plannedBudgetFcfa > 0 ? Math.round((consumedBudgetFcfa / plannedBudgetFcfa) * 100) : 0,
        activeUsers: users.length,
        commercialWins: quotes.filter((quote) => quote.client.status === CommercialStatus.WON).length,
      },
      expensesByCategory: this.groupExpenses(expenses),
      commercialPerformance: {
        quotesTotal: quotes.length,
        acceptedQuotes: acceptedQuotes.length,
        rejectedQuotes: quotes.filter((quote) => quote.status === CommercialQuoteStatus.REJECTED).length,
        pendingQuotes: quotes.filter((quote) => pendingQuoteStatuses.includes(quote.status)).length,
      },
      topClients: this.topClients(acceptedQuotes),
      eventPerformance: events.map((event) => ({
        id: event.id,
        title: event.title,
        status: event.status,
        startsAt: event.startsAt,
        budgetFcfa: event.budgets.reduce((total, budget) => total + budget.plannedAmountFcfa, 0),
        expensesFcfa: event.expenses.reduce((total, expense) => total + expense.amountFcfa, 0),
      })),
      activeUsers: users,
      exports,
    };
  }

  async export(user: AuthenticatedUser, dto: ExportReportDto) {
    const summary = await this.summary(dto);
    const title = dto.title?.trim() || `Rapport M Group ${new Date().toLocaleDateString('fr-FR')}`;
    const fileUrl =
      dto.format === ReportExportFormat.PDF
        ? this.toPdfDataUrl(this.toReadableReport(title, summary))
        : this.toExcelDataUrl(this.toCsv(summary));

    const exportLog = await this.prisma.reportExport.create({
      data: {
        generatedById: user.sub,
        title,
        format: dto.format,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
        fileUrl,
        metadata: summary as Prisma.InputJsonObject,
      },
    });

    await this.prisma.loginAuditLog.create({
      data: {
        userId: user.sub,
        action: AuditAction.REPORT_EXPORTED,
        metadata: { exportId: exportLog.id, format: dto.format },
      },
    });

    await this.notifications.notifyUser(user.sub, {
      type: NotificationType.REPORT_READY,
      title: 'Rapport genere',
      message: `${title} est disponible au format ${dto.format}.`,
      channels: ['IN_APP', 'SOUND'],
      actionUrl: '#reports',
      metadata: { exportId: exportLog.id, format: dto.format },
    });

    return exportLog;
  }

  private buildRange(dto: ReportPeriodDto) {
    if (!dto.periodStart && !dto.periodEnd) {
      return undefined;
    }

    return {
      gte: dto.periodStart ? new Date(dto.periodStart) : undefined,
      lte: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
    };
  }

  private groupExpenses(expenses: { category: string | null; amountFcfa: number }[]) {
    const grouped = expenses.reduce<Record<string, number>>((result, expense) => {
      const category = expense.category || 'Sans categorie';
      result[category] = (result[category] ?? 0) + expense.amountFcfa;
      return result;
    }, {});

    return Object.entries(grouped)
      .map(([category, amountFcfa]) => ({ category, amountFcfa }))
      .sort((a, b) => b.amountFcfa - a.amountFcfa);
  }

  private topClients(quotes: { client: { id: string; name: string }; amountFcfa: number }[]) {
    const grouped = quotes.reduce<Record<string, { id: string; name: string; revenueFcfa: number }>>(
      (result, quote) => {
        result[quote.client.id] ??= { id: quote.client.id, name: quote.client.name, revenueFcfa: 0 };
        result[quote.client.id].revenueFcfa += quote.amountFcfa;
        return result;
      },
      {},
    );

    return Object.values(grouped)
      .sort((a, b) => b.revenueFcfa - a.revenueFcfa)
      .slice(0, 5);
  }

  private toReadableReport(title: string, summary: Awaited<ReturnType<ReportsService['summary']>>) {
    return [
      title,
      `Chiffre d'affaires : ${summary.totals.revenueFcfa} FCFA`,
      `Evenements realises : ${summary.totals.completedEvents}`,
      `Budget consomme : ${summary.totals.consumedBudgetFcfa} FCFA`,
      `Utilisateurs actifs : ${summary.totals.activeUsers}`,
      `Devis acceptes : ${summary.commercialPerformance.acceptedQuotes}`,
      'Depenses par categorie :',
      ...summary.expensesByCategory.map((item) => `- ${item.category}: ${item.amountFcfa} FCFA`),
    ].join('\n');
  }

  private toCsv(summary: Awaited<ReturnType<ReportsService['summary']>>) {
    const rows = [
      ['Indicateur', 'Valeur'],
      ['Chiffre affaires FCFA', summary.totals.revenueFcfa],
      ['Evenements realises', summary.totals.completedEvents],
      ['Budget prevu FCFA', summary.totals.plannedBudgetFcfa],
      ['Budget consomme FCFA', summary.totals.consumedBudgetFcfa],
      ['Utilisateurs actifs', summary.totals.activeUsers],
      ['Devis acceptes', summary.commercialPerformance.acceptedQuotes],
    ];

    return rows.map((row) => row.join(';')).join('\n');
  }

  private toPdfDataUrl(content: string) {
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

  private toExcelDataUrl(csv: string) {
    return `data:application/vnd.ms-excel;base64,${Buffer.from(csv).toString('base64')}`;
  }
}
