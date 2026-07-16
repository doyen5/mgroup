import {
  CommercialQuoteStatus,
  CommercialStatus,
  ServiceRequestStatus,
} from '@prisma/client';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(CommercialStatus)
  status?: CommercialStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(CommercialStatus)
  status?: CommercialStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateServiceRequestDto {
  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedBudgetFcfa?: number;

  @IsOptional()
  @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;
}

export class UpdateServiceRequestDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedBudgetFcfa?: number;

  @IsOptional()
  @IsEnum(ServiceRequestStatus)
  status?: ServiceRequestStatus;

  @IsOptional()
  @IsISO8601()
  dueAt?: string;
}

export class CreateQuoteDto {
  @IsString()
  clientId: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsString()
  title: string;

  @IsInt()
  @Min(0)
  amountFcfa: number;

  @IsOptional()
  @IsEnum(CommercialQuoteStatus)
  status?: CommercialQuoteStatus;

  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateQuoteDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountFcfa?: number;

  @IsOptional()
  @IsEnum(CommercialQuoteStatus)
  status?: CommercialQuoteStatus;

  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateExchangeDto {
  @IsString()
  clientId: string;

  @IsString()
  channel: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  notes: string;

  @IsOptional()
  @IsISO8601()
  exchangedAt?: string;
}
