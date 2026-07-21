import {
  BusinessDocumentScope,
  BusinessDocumentStatus,
  BusinessDocumentType,
} from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBusinessDocumentDto {
  @IsEnum(BusinessDocumentScope)
  scope: BusinessDocumentScope;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  label: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsEnum(BusinessDocumentType)
  type?: BusinessDocumentType;

  @IsOptional()
  @IsEnum(BusinessDocumentStatus)
  status?: BusinessDocumentStatus;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sizeBytes?: number;

  @IsOptional()
  @IsString()
  checksum?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsBoolean()
  logoIncluded?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ValidateBusinessDocumentDto {
  @IsEnum(BusinessDocumentStatus)
  status: BusinessDocumentStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBusinessDocumentDto {
  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsEnum(BusinessDocumentType)
  type?: BusinessDocumentType;

  @IsOptional()
  @IsEnum(BusinessDocumentStatus)
  status?: BusinessDocumentStatus;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsBoolean()
  logoIncluded?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GenerateBusinessDocumentDto {
  @IsEnum(BusinessDocumentScope)
  scope: BusinessDocumentScope;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(BusinessDocumentType)
  type: BusinessDocumentType;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountFcfa?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
