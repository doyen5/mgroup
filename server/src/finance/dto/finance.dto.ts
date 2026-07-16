import { BudgetStatus, FinanceDocumentType, PaymentStatus } from '@prisma/client';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsString()
  label: string;

  @IsInt()
  @Min(0)
  plannedAmountFcfa: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;
}

export class UpdateBudgetDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  plannedAmountFcfa?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;
}

export class ValidateBudgetDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  approvedAmountFcfa?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateExpenseDto {
  @IsString()
  label: string;

  @IsInt()
  @Min(0)
  amountFcfa: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsISO8601()
  spentAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePaymentDto {
  @IsString()
  label: string;

  @IsInt()
  @Min(0)
  amountFcfa: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsISO8601()
  paidAt?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountFcfa?: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @IsOptional()
  @IsISO8601()
  paidAt?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateFinanceDocumentDto {
  @IsString()
  label: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsEnum(FinanceDocumentType)
  type?: FinanceDocumentType;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountFcfa?: number;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}
