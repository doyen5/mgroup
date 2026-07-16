import { Injectable, NotFoundException } from '@nestjs/common';
import { BudgetStatus, PaymentStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBudgetDto,
  CreateExpenseDto,
  CreateFinanceDocumentDto,
  CreatePaymentDto,
  UpdateBudgetDto,
  UpdatePaymentDto,
  ValidateBudgetDto,
} from './dto/finance.dto';

const financeInclude = {
  budgets: {
    include: {
      validatedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  expenses: {
    orderBy: { spentAt: 'desc' as const },
  },
  payments: {
    orderBy: [{ dueAt: 'asc' as const }, { createdAt: 'desc' as const }],
  },
  documents: {
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const events = await this.prisma.event.findMany({
      orderBy: { startsAt: 'asc' },
      include: financeInclude,
    });
    const eventSummaries = events.map((event) => this.toEventFinanceSummary(event));

    return {
      totals: {
        plannedBudgetFcfa: this.sumBy(eventSummaries, (event) => event.plannedBudgetFcfa),
        approvedBudgetFcfa: this.sumBy(eventSummaries, (event) => event.approvedBudgetFcfa),
        actualExpensesFcfa: this.sumBy(eventSummaries, (event) => event.actualExpensesFcfa),
        paidFcfa: this.sumBy(eventSummaries, (event) => event.paidFcfa),
        pendingPaymentsFcfa: this.sumBy(eventSummaries, (event) => event.pendingPaymentsFcfa),
        overBudgetFcfa: eventSummaries.reduce(
          (total, event) => total + Math.max(event.actualExpensesFcfa - event.limitFcfa, 0),
          0,
        ),
      },
      alerts: eventSummaries.filter((event) => event.isOverBudget),
      events: eventSummaries,
    };
  }

  async eventFinance(eventId: string) {
    const event = await this.findEvent(eventId);
    return {
      ...event,
      finance: this.toEventFinanceSummary(event),
    };
  }

  async createBudget(eventId: string, dto: CreateBudgetDto) {
    await this.ensureEventExists(eventId);
    await this.prisma.eventBudget.create({
      data: {
        eventId,
        label: dto.label.trim(),
        plannedAmountFcfa: dto.plannedAmountFcfa,
        notes: this.clean(dto.notes),
        status: dto.status ?? BudgetStatus.PENDING_APPROVAL,
      },
    });

    return this.eventFinance(eventId);
  }

  async updateBudget(budgetId: string, dto: UpdateBudgetDto) {
    const budget = await this.findBudget(budgetId);

    await this.prisma.eventBudget.update({
      where: { id: budgetId },
      data: {
        label: this.clean(dto.label),
        plannedAmountFcfa: dto.plannedAmountFcfa,
        notes: this.clean(dto.notes),
        status: dto.status,
      },
    });

    return this.eventFinance(budget.eventId);
  }

  async approveBudget(budgetId: string, dto: ValidateBudgetDto, admin: AuthenticatedUser) {
    const budget = await this.findBudget(budgetId);

    await this.prisma.eventBudget.update({
      where: { id: budgetId },
      data: {
        status: BudgetStatus.APPROVED,
        approvedAmountFcfa: dto.approvedAmountFcfa ?? budget.plannedAmountFcfa,
        notes: this.clean(dto.notes) ?? budget.notes,
        validatedById: admin.sub,
        validatedAt: new Date(),
      },
    });

    return this.eventFinance(budget.eventId);
  }

  async rejectBudget(budgetId: string, dto: ValidateBudgetDto, admin: AuthenticatedUser) {
    const budget = await this.findBudget(budgetId);

    await this.prisma.eventBudget.update({
      where: { id: budgetId },
      data: {
        status: BudgetStatus.REJECTED,
        notes: this.clean(dto.notes) ?? budget.notes,
        validatedById: admin.sub,
        validatedAt: new Date(),
      },
    });

    return this.eventFinance(budget.eventId);
  }

  async createExpense(eventId: string, dto: CreateExpenseDto) {
    await this.ensureEventExists(eventId);
    await this.prisma.eventExpense.create({
      data: {
        eventId,
        label: dto.label.trim(),
        amountFcfa: dto.amountFcfa,
        category: this.clean(dto.category),
        vendor: this.clean(dto.vendor),
        spentAt: dto.spentAt ? new Date(dto.spentAt) : new Date(),
        notes: this.clean(dto.notes),
      },
    });

    return this.eventFinance(eventId);
  }

  async createPayment(eventId: string, dto: CreatePaymentDto) {
    await this.ensureEventExists(eventId);
    await this.prisma.eventPayment.create({
      data: {
        eventId,
        label: dto.label.trim(),
        amountFcfa: dto.amountFcfa,
        status: dto.status ?? PaymentStatus.PENDING,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        method: this.clean(dto.method),
        reference: this.clean(dto.reference),
        notes: this.clean(dto.notes),
      },
    });

    return this.eventFinance(eventId);
  }

  async updatePayment(paymentId: string, dto: UpdatePaymentDto) {
    const payment = await this.prisma.eventPayment.findUnique({ where: { id: paymentId } });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    await this.prisma.eventPayment.update({
      where: { id: paymentId },
      data: {
        label: this.clean(dto.label),
        amountFcfa: dto.amountFcfa,
        status: dto.status,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
        method: this.clean(dto.method),
        reference: this.clean(dto.reference),
        notes: this.clean(dto.notes),
      },
    });

    return this.eventFinance(payment.eventId);
  }

  async createDocument(eventId: string, dto: CreateFinanceDocumentDto) {
    await this.ensureEventExists(eventId);
    await this.prisma.eventFinanceDocument.create({
      data: {
        eventId,
        label: dto.label.trim(),
        type: dto.type,
        amountFcfa: dto.amountFcfa,
        url: dto.url,
        fileName: this.clean(dto.fileName),
        mimeType: this.clean(dto.mimeType),
      },
    });

    return this.eventFinance(eventId);
  }

  async removeDocument(documentId: string) {
    const document = await this.prisma.eventFinanceDocument.findUnique({ where: { id: documentId } });

    if (!document) {
      throw new NotFoundException('Finance document not found.');
    }

    await this.prisma.eventFinanceDocument.delete({ where: { id: documentId } });
    return this.eventFinance(document.eventId);
  }

  private async findEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: financeInclude,
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    return event;
  }

  private async ensureEventExists(eventId: string) {
    const count = await this.prisma.event.count({ where: { id: eventId } });

    if (count === 0) {
      throw new NotFoundException('Event not found.');
    }
  }

  private async findBudget(budgetId: string) {
    const budget = await this.prisma.eventBudget.findUnique({ where: { id: budgetId } });

    if (!budget) {
      throw new NotFoundException('Budget not found.');
    }

    return budget;
  }

  private toEventFinanceSummary(event: Awaited<ReturnType<FinanceService['findEvent']>>) {
    const plannedBudgetFcfa = event.budgets.reduce((total, budget) => total + budget.plannedAmountFcfa, 0);
    const approvedBudgetFcfa = event.budgets.reduce(
      (total, budget) => total + (budget.approvedAmountFcfa ?? 0),
      0,
    );
    const actualExpensesFcfa = event.expenses.reduce((total, expense) => total + expense.amountFcfa, 0);
    const paidFcfa = event.payments
      .filter((payment) => payment.status === PaymentStatus.PAID)
      .reduce((total, payment) => total + payment.amountFcfa, 0);
    const pendingStatuses: PaymentStatus[] = [
      PaymentStatus.PENDING,
      PaymentStatus.PARTIAL,
      PaymentStatus.OVERDUE,
    ];
    const pendingPaymentsFcfa = event.payments
      .filter((payment) => pendingStatuses.includes(payment.status))
      .reduce((total, payment) => total + payment.amountFcfa, 0);
    const limitFcfa = approvedBudgetFcfa || plannedBudgetFcfa || event.budgetFcfa || 0;

    return {
      eventId: event.id,
      title: event.title,
      startsAt: event.startsAt,
      status: event.status,
      plannedBudgetFcfa,
      approvedBudgetFcfa,
      actualExpensesFcfa,
      paidFcfa,
      pendingPaymentsFcfa,
      limitFcfa,
      isOverBudget: limitFcfa > 0 && actualExpensesFcfa > limitFcfa,
    };
  }

  private sumBy<T>(items: T[], selector: (item: T) => number) {
    return items.reduce((total, item) => total + selector(item), 0);
  }

  private clean(value?: string) {
    return value === undefined ? undefined : value.trim();
  }
}
