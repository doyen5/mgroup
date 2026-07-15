import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateCompanyDto {
  // Champs modifiables depuis Parametres > Entreprise, uniquement par un Admin.
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  taxInfo?: string;

  @IsOptional()
  @IsString()
  documentFooter?: string;
}
