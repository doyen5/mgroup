import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  idToken: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class GoogleCodeLoginDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
