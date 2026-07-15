import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CompanyAdminSetupDto {
  @IsString()
  companyName: string;

  @IsString()
  legalName: string;

  @IsString()
  companyAddress: string;

  @IsEmail()
  companyEmail: string;

  @IsString()
  companyPhone: string;

  @IsOptional()
  @IsString()
  companyPhotoUrl?: string;

  @IsString()
  adminFirstName: string;

  @IsString()
  adminLastName: string;

  @IsString()
  adminAddress: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  adminPhone: string;

  @IsOptional()
  @IsString()
  adminPhotoUrl?: string;

  @IsString()
  @MinLength(8)
  adminPassword: string;
}
