import { RoleName, UserStatus } from '@prisma/client';

export type AuthenticatedUser = {
  sub: string;
  email: string;
  roles: RoleName[];
  status: UserStatus;
};
