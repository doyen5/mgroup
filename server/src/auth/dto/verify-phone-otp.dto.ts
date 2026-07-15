import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class VerifyPhoneOtpDto {
  @IsString()
  @MinLength(6)
  phone: string;

  @IsString()
  @MinLength(4)
  code: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
