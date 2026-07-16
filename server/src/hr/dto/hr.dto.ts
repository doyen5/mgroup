import {
  StaffAvailability,
  StaffContractStatus,
  StaffContractType,
  StaffDocumentType,
  StaffMissionStatus,
} from '@prisma/client';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class UpsertStaffProfileDto {
  @IsOptional()
  @IsString()
  internalRole?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(StaffAvailability)
  availability?: StaffAvailability;

  @IsOptional()
  @IsString()
  availabilityNotes?: string;

  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @IsOptional()
  @IsISO8601()
  hireDate?: string;
}

export class CreateStaffContractDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(StaffContractType)
  type?: StaffContractType;

  @IsOptional()
  @IsEnum(StaffContractStatus)
  status?: StaffContractStatus;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  salaryFcfa?: number;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateStaffDocumentDto {
  @IsString()
  label: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsEnum(StaffDocumentType)
  type?: StaffDocumentType;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class CreateStaffMissionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  roleNote?: string;

  @IsOptional()
  @IsEnum(StaffMissionStatus)
  status?: StaffMissionStatus;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
