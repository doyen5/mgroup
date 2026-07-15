import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class VerifyTwoFactorLoginDto {
  @IsString()
  challengeId: string;

  @IsString()
  @MinLength(6)
  code: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class TwoFactorCodeDto {
  @IsString()
  @MinLength(6)
  code: string;
}
