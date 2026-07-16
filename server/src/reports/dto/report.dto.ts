import { ReportExportFormat } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class ReportPeriodDto {
  @IsOptional()
  @IsISO8601()
  periodStart?: string;

  @IsOptional()
  @IsISO8601()
  periodEnd?: string;
}

export class ExportReportDto extends ReportPeriodDto {
  @IsEnum(ReportExportFormat)
  format: ReportExportFormat;

  @IsOptional()
  @IsString()
  title?: string;
}
