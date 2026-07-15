import { RoleName } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class ApproveUserDto {
  @IsEnum(RoleName)
  role: RoleName;

  @IsOptional()
  @IsString()
  @MinLength(10)
  temporaryPassword?: string;
}
