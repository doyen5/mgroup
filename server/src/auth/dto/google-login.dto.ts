import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  idToken: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
