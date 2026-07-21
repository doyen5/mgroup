import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import {
  CreateBudgetDto,
  CreateExpenseDto,
  CreateFinanceDocumentDto,
  CreatePaymentDto,
  UpdateBudgetDto,
  UpdatePaymentDto,
  ValidateBudgetDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

@UseGuards(JwtAuthGuard)
@Roles(RoleName.ADMIN, RoleName.COMPTABLE)
@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('summary')
  summary() {
    return this.finance.summary();
  }

  @Get('events/:eventId')
  eventFinance(@Param('eventId') eventId: string) {
    return this.finance.eventFinance(eventId);
  }

  @Post('events/:eventId/budgets')
  createBudget(@Param('eventId') eventId: string, @Body() dto: CreateBudgetDto) {
    return this.finance.createBudget(eventId, dto);
  }

  @Patch('budgets/:budgetId')
  updateBudget(@Param('budgetId') budgetId: string, @Body() dto: UpdateBudgetDto) {
    return this.finance.updateBudget(budgetId, dto);
  }

  @Roles(RoleName.ADMIN)
  @Patch('budgets/:budgetId/approve')
  approveBudget(
    @Param('budgetId') budgetId: string,
    @Body() dto: ValidateBudgetDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.finance.approveBudget(budgetId, dto, admin);
  }

  @Roles(RoleName.ADMIN)
  @Patch('budgets/:budgetId/reject')
  rejectBudget(
    @Param('budgetId') budgetId: string,
    @Body() dto: ValidateBudgetDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.finance.rejectBudget(budgetId, dto, admin);
  }

  @Post('events/:eventId/expenses')
  createExpense(@Param('eventId') eventId: string, @Body() dto: CreateExpenseDto) {
    return this.finance.createExpense(eventId, dto);
  }

  @Post('events/:eventId/payments')
  createPayment(@Param('eventId') eventId: string, @Body() dto: CreatePaymentDto) {
    return this.finance.createPayment(eventId, dto);
  }

  @Patch('payments/:paymentId')
  updatePayment(@Param('paymentId') paymentId: string, @Body() dto: UpdatePaymentDto) {
    return this.finance.updatePayment(paymentId, dto);
  }

  @Post('events/:eventId/documents')
  createDocument(@Param('eventId') eventId: string, @Body() dto: CreateFinanceDocumentDto) {
    return this.finance.createDocument(eventId, dto);
  }

  @Delete('documents/:documentId')
  removeDocument(@Param('documentId') documentId: string) {
    return this.finance.removeDocument(documentId);
  }
}
