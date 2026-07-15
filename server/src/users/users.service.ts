import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, RoleName, UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { DEFAULT_ROLES } from '../common/roles';
import { PasswordService } from '../common/security/password.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveUserDto } from './dto/approve-user.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async pending() {
    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.toPublicUser(user));
  }

  async list() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { roles: { include: { role: true } } },
    });

    return users.map((user) => this.toPublicUser(user));
  }

  async approve(userId: string, dto: ApproveUserDto, admin: AuthenticatedUser) {
    await this.ensureRoles();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: dto.role } });
    const temporaryPassword = dto.temporaryPassword ?? this.generateTemporaryPassword();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });

      return tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: await this.passwords.hash(temporaryPassword),
          status: UserStatus.FORCE_PASSWORD_CHANGE,
          lastPasswordChangedAt: new Date(),
        },
        include: { roles: { include: { role: true } } },
      });
    });

    await this.prisma.loginAuditLog.create({
      data: {
        userId: admin.sub,
        action: AuditAction.USER_APPROVED,
        metadata: {
          approvedUserId: userId,
          role: dto.role,
        },
      },
    });

    return {
      message: 'User approved. Communicate the temporary password securely.',
      temporaryPassword,
      user: this.toPublicUser(updated),
    };
  }

  async updateRole(userId: string, dto: UpdateRoleDto, admin: AuthenticatedUser) {
    await this.ensureRoles();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const role = await this.prisma.role.findUniqueOrThrow({ where: { name: dto.role } });

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { roles: { include: { role: true } } },
      });
    });

    await this.prisma.loginAuditLog.create({
      data: {
        userId: admin.sub,
        action: AuditAction.ROLE_CHANGED,
        metadata: {
          changedUserId: userId,
          role: dto.role,
        },
      },
    });

    return this.toPublicUser(updated);
  }

  async disable(userId: string, admin: AuthenticatedUser) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.DISABLED },
      include: { roles: { include: { role: true } } },
    });

    await this.prisma.loginAuditLog.create({
      data: {
        userId: admin.sub,
        action: AuditAction.USER_DISABLED,
        metadata: { disabledUserId: userId },
      },
    });

    return this.toPublicUser(user);
  }

  async reactivate(userId: string, admin: AuthenticatedUser) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
      include: { roles: { include: { role: true } } },
    });

    await this.prisma.loginAuditLog.create({
      data: {
        userId: admin.sub,
        action: AuditAction.USER_REACTIVATED,
        metadata: { reactivatedUserId: userId },
      },
    });

    return this.toPublicUser(user);
  }

  async resetPassword(userId: string, dto: ResetUserPasswordDto, admin: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const temporaryPassword = dto.temporaryPassword ?? this.generateTemporaryPassword();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      return tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: await this.passwords.hash(temporaryPassword),
          status: UserStatus.FORCE_PASSWORD_CHANGE,
          lastPasswordChangedAt: new Date(),
        },
        include: { roles: { include: { role: true } } },
      });
    });

    await this.prisma.loginAuditLog.create({
      data: {
        userId: admin.sub,
        action: AuditAction.USER_PASSWORD_RESET,
        metadata: { resetUserId: userId },
      },
    });

    return {
      message: 'Temporary password generated. Communicate it securely.',
      temporaryPassword,
      user: this.toPublicUser(updated),
    };
  }

  async history(userId: string) {
    await this.ensureUserExists(userId);

    return this.prisma.loginAuditLog.findMany({
      where: {
        OR: [
          { userId },
          { metadata: { path: ['approvedUserId'], equals: userId } },
          { metadata: { path: ['changedUserId'], equals: userId } },
          { metadata: { path: ['disabledUserId'], equals: userId } },
          { metadata: { path: ['reactivatedUserId'], equals: userId } },
          { metadata: { path: ['resetUserId'], equals: userId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async activity() {
    return this.prisma.loginAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 80,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async me(user: AuthenticatedUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.sub },
      include: { roles: { include: { role: true } } },
    });

    if (!dbUser) {
      throw new NotFoundException('User not found.');
    }

    return this.toPublicUser(dbUser);
  }

  async updateMe(user: AuthenticatedUser, dto: UpdateProfileDto) {
    const email = dto.email?.toLowerCase().trim();
    const currentUser = await this.prisma.user.findUnique({ where: { id: user.sub } });

    if (email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });

      if (existing && existing.id !== user.sub) {
        throw new ConflictException('A user with this email already exists.');
      }
    }

    // Seuls les champs envoyes sont mis a jour, ce qui evite d'effacer une donnee par erreur.
    const updated = await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        firstName: this.clean(dto.firstName),
        lastName: this.clean(dto.lastName),
        address: this.clean(dto.address),
        email,
        phone: this.clean(dto.phone),
        photoUrl: dto.photoUrl,
        emailVerifiedAt:
          email && currentUser?.email !== email ? null : undefined,
      },
      include: { roles: { include: { role: true } } },
    });

    await this.prisma.loginAuditLog.create({
      data: {
        userId: user.sub,
        action: AuditAction.PROFILE_UPDATED,
      },
    });

    return this.toPublicUser(updated);
  }

  private async ensureRoles() {
    for (const role of DEFAULT_ROLES) {
      await this.prisma.role.upsert({
        where: { name: role.name },
        update: {
          label: role.label,
          description: role.description,
        },
        create: role,
      });
    }
  }

  private generateTemporaryPassword() {
    return `MGroup-${randomBytes(6).toString('base64url')}`;
  }

  private async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }
  }

  private clean(value?: string) {
    return value === undefined ? undefined : value.trim();
  }

  private toPublicUser(user: {
    id: string;
    firstName: string;
    lastName: string;
    address?: string | null;
    email: string;
    phone?: string | null;
    photoUrl?: string | null;
    status: UserStatus;
    lastLoginAt?: Date | null;
    emailVerifiedAt?: Date | null;
    phoneVerifiedAt?: Date | null;
    lockedUntil?: Date | null;
    twoFactorEnabled?: boolean;
    lastPasswordChangedAt?: Date | null;
    roles?: Array<{ role: { name: RoleName; label: string } }>;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address,
      email: user.email,
      phone: user.phone,
      photoUrl: user.photoUrl,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      lockedUntil: user.lockedUntil,
      twoFactorEnabled: user.twoFactorEnabled,
      lastPasswordChangedAt: user.lastPasswordChangedAt,
      roles: user.roles?.map(({ role }) => ({
        name: role.name,
        label: role.label,
      })) ?? [],
    };
  }
}
