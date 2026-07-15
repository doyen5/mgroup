import { RoleName } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRoleDto {
  @IsEnum(RoleName)
  role: RoleName;
}
