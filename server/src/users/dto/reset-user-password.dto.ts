import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResetUserPasswordDto {
  // L'admin peut fournir un mot de passe temporaire ou laisser le backend en generer un.
  @IsOptional()
  @IsString()
  @MinLength(10)
  temporaryPassword?: string;
}
