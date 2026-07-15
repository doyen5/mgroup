import {
  ForbiddenException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AuditAction, Prisma, RoleName, User, UserStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PasswordService } from '../common/security/password.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

type UserWithRoles = User & {
  roles: Array<{ role: { name: RoleName; label: string } }>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, metadata: { ipAddress?: string; userAgent?: string }) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    const isPasswordValid = await this.passwords.compare(dto.password, user?.passwordHash);

    if (!user || !isPasswordValid) {
      await this.audit(null, AuditAction.LOGIN_FAILED, metadata, { email });
      throw new UnauthorizedException('Invalid credentials.');
    }

    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException('User registration is pending admin approval.');
    }

    if (user.status === UserStatus.DISABLED) {
      throw new ForbiddenException('User account is disabled.');
    }

    // On recupere l'utilisateur mis a jour pour renvoyer un profil coherent au frontend.
    const loggedInUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
      include: { roles: { include: { role: true } } },
    });
    await this.audit(user.id, AuditAction.LOGIN_SUCCESS, metadata);

    const tokens = await this.createSession(loggedInUser, dto.rememberMe);

    return {
      ...tokens,
      forcePasswordChange: loggedInUser.status === UserStatus.FORCE_PASSWORD_CHANGE,
      user: this.toPublicUser(loggedInUser),
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const company = await this.prisma.company.findFirst();
    const user = await this.prisma.user.create({
      data: {
        companyId: company?.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        address: dto.address,
        email,
        phone: dto.phone,
        photoUrl: dto.photoUrl,
        status: UserStatus.PENDING,
      },
    });

    await this.audit(user.id, AuditAction.USER_REGISTERED, {});

    return {
      message: 'Registration submitted. Waiting for admin approval.',
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
    };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token.');
    }

    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: { roles: { include: { role: true } } },
        },
      },
    });

    for (const storedToken of storedTokens) {
      const matches = await this.passwords.compare(refreshToken, storedToken.tokenHash);

      if (!matches) {
        continue;
      }

      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      const tokens = await this.createSession(storedToken.user);

      return {
        ...tokens,
        forcePasswordChange: storedToken.user.status === UserStatus.FORCE_PASSWORD_CHANGE,
        user: this.toPublicUser(storedToken.user),
      };
    }

    throw new UnauthorizedException('Invalid refresh token.');
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { message: 'Logged out.' };
    }

    const storedTokens = await this.prisma.refreshToken.findMany({
      where: { revokedAt: null },
    });

    for (const storedToken of storedTokens) {
      const matches = await this.passwords.compare(refreshToken, storedToken.tokenHash);

      if (matches) {
        await this.prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { revokedAt: new Date() },
        });
        await this.audit(storedToken.userId, AuditAction.LOGOUT, {}, { scope: 'current-session' });
        break;
      }
    }

    return { message: 'Logged out.' };
  }

  async logoutAll(user: AuthenticatedUser) {
    // Revoque tous les refresh tokens : les autres navigateurs devront se reconnecter.
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId: user.sub,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    await this.audit(user.sub, AuditAction.LOGOUT, {}, { scope: 'all-devices' });

    return {
      message: 'All sessions have been revoked.',
      revokedSessions: result.count,
    };
  }

  async sessions(user: AuthenticatedUser) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const now = new Date();

    // Le hash du token n'est jamais expose ; l'interface ne voit que l'etat de la session.
    return sessions.map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      isActive: !session.revokedAt && session.expiresAt > now,
    }));
  }

  async loginHistory(user: AuthenticatedUser) {
    // Historique centre sur les evenements de connexion/securite du compte connecte.
    return this.prisma.loginAuditLog.findMany({
      where: {
        userId: user.sub,
        action: {
          in: [
            AuditAction.LOGIN_SUCCESS,
            AuditAction.LOGOUT,
            AuditAction.PASSWORD_CHANGED,
            AuditAction.PROFILE_UPDATED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async changePassword(user: AuthenticatedUser, dto: ChangePasswordDto) {
    const dbUser = await this.prisma.user.findUnique({ where: { id: user.sub } });

    if (!dbUser) {
      throw new UnauthorizedException('User not found.');
    }

    const currentMatches = await this.passwords.compare(dto.currentPassword, dbUser.passwordHash);

    if (!currentMatches) {
      throw new UnauthorizedException('Current password is invalid.');
    }

    await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        passwordHash: await this.passwords.hash(dto.newPassword),
        status: UserStatus.ACTIVE,
      },
    });
    await this.audit(user.sub, AuditAction.PASSWORD_CHANGED, {});

    return { message: 'Password changed.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const message =
      'If an active account exists for this email, a reset instruction has been generated.';

    if (!user || user.status === UserStatus.PENDING || user.status === UserStatus.DISABLED) {
      return { message };
    }

    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: await this.passwords.hash(resetToken),
        expiresAt,
      },
    });

    return {
      message,
      // En production, ce token doit partir par email. Pour le prototype local, on l'affiche.
      developmentResetToken: resetToken,
      expiresAt,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const resetTokens = await this.prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    for (const resetToken of resetTokens) {
      const matches = await this.passwords.compare(dto.token, resetToken.tokenHash);

      if (!matches) {
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: resetToken.userId },
          data: {
            passwordHash: await this.passwords.hash(dto.newPassword),
            status: UserStatus.ACTIVE,
          },
        });
        await tx.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        });
        await tx.refreshToken.updateMany({
          where: {
            userId: resetToken.userId,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      });
      await this.audit(resetToken.userId, AuditAction.PASSWORD_CHANGED, {}, { source: 'reset' });

      return { message: 'Password reset completed.' };
    }

    throw new UnauthorizedException('Invalid or expired reset token.');
  }

  private async createSession(user: UserWithRoles, rememberMe = false) {
    const roles = user.roles.map(({ role }) => role.name);
    const payload: AuthenticatedUser = {
      sub: user.id,
      email: user.email,
      roles,
      status: user.status,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      expiresIn: this.accessTokenExpiresIn(),
    });
    const refreshToken = randomBytes(48).toString('hex');
    const refreshDays = rememberMe
      ? this.numberConfig('REMEMBER_ME_DAYS', 30)
      : this.numberConfig('REFRESH_TOKEN_DAYS', 7);
    const expiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: await this.passwords.hash(refreshToken),
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  private toPublicUser(user: UserWithRoles) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      address: user.address,
      phone: user.phone,
      photoUrl: user.photoUrl,
      status: user.status,
      roles: user.roles.map(({ role }) => ({
        name: role.name,
        label: role.label,
      })),
      lastLoginAt: user.lastLoginAt,
    };
  }

  private accessTokenExpiresIn(): JwtSignOptions['expiresIn'] {
    // JWT accepte soit un nombre de secondes, soit une duree de type "15m", "1h", etc.
    const value = this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    return /^\d+$/.test(value) ? Number(value) : (value as JwtSignOptions['expiresIn']);
  }

  private numberConfig(key: string, fallback: number) {
    // ConfigService lit les valeurs .env comme du texte ; cette methode evite les NaN silencieux.
    const value = Number(this.config.get<string>(key));
    return Number.isFinite(value) ? value : fallback;
  }

  private async audit(
    userId: string | null,
    action: AuditAction,
    metadata: { ipAddress?: string; userAgent?: string },
    extra?: Record<string, unknown>,
  ) {
    // Prisma attend une valeur JSON explicite ; `undefined` laisse la colonne vide.
    const auditMetadata = extra ? (extra as Prisma.InputJsonObject) : undefined;

    await this.prisma.loginAuditLog.create({
      data: {
        userId,
        action,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        metadata: auditMetadata,
      },
    });
  }
}
