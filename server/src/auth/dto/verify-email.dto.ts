import { IsEmail, IsString } from 'class-validator';

export class ResendEmailVerificationDto {
  @IsEmail()
  email: string;
}

export class VerifyEmailDto {
  @IsString()
  token: string;
}
