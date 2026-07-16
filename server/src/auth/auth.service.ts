import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import {
  AuditAction,
  AuthChallengeType,
  NotificationStatus,
  NotificationType,
  Prisma,
  RoleName,
  User,
  UserStatus,
} from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes, randomInt } from 'crypto';
import * as speakeasy from 'speakeasy';
import { PasswordService } from '../common/security/password.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPhoneOtpDto } from './dto/request-phone-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendEmailVerificationDto, VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { TwoFactorCodeDto, VerifyTwoFactorLoginDto } from './dto/two-factor.dto';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';

type AuthMetadata = { ipAddress?: string; userAgent?: string };

type UserWithRoles = User & {
  roles: Array<{ role: { name: RoleName; label: string } }>;
};

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  async login(dto: LoginDto, metadata: AuthMetadata) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      await this.audit(user.id, AuditAction.LOGIN_FAILED, metadata, { email, reason: 'locked' });
      throw new ForbiddenException('Account temporarily locked. Try again later.');
    }

    const isPasswordValid = await this.passwords.compare(dto.password, user?.passwordHash);

    if (!user || !isPasswordValid) {
      await this.handleFailedLogin(user, email, metadata);
      throw new UnauthorizedException('Invalid credentials.');
    }

    this.ensureCanAuthenticate(user);

    if (user.twoFactorEnabled) {
      return this.createTwoFactorChallenge(user, metadata);
    }

    return this.completeLogin(user, dto.rememberMe, metadata, AuditAction.LOGIN_SUCCESS);
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
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        address: dto.address.trim(),
        email,
        phone: dto.phone.trim(),
        photoUrl: dto.photoUrl,
        status: UserStatus.PENDING,
      },
    });

    const verification = await this.createEmailVerification(user.id, user.email);

    await this.audit(user.id, AuditAction.USER_REGISTERED, {});
    await this.notifyAdminsAboutRegistration(user);

    return {
      message: 'Registration submitted. Waiting for admin approval.',
      emailVerificationSent: verification.emailDelivered,
      developmentEmailVerificationToken: this.shouldExposeDevTokens() ? verification.token : undefined,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
      },
    };
  }

  async resendEmailVerification(dto: ResendEmailVerificationDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const message = 'If this account exists, a verification email has been sent.';

    if (!user || user.emailVerifiedAt) {
      return { message };
    }

    const verification = await this.createEmailVerification(user.id, user.email);

    return {
      message,
      emailVerificationSent: verification.emailDelivered,
      developmentEmailVerificationToken: this.shouldExposeDevTokens() ? verification.token : undefined,
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokens = await this.prisma.emailVerificationToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    for (const token of tokens) {
      const matches = await this.passwords.compare(dto.token, token.tokenHash);

      if (!matches) {
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.emailVerificationToken.update({
          where: { id: token.id },
          data: { usedAt: new Date() },
        });
        await tx.user.update({
          where: { id: token.userId },
          data: { emailVerifiedAt: new Date() },
        });
      });
      await this.audit(token.userId, AuditAction.EMAIL_VERIFIED, {}, { email: token.user.email });

      return { message: 'Email verified.' };
    }

    throw new UnauthorizedException('Invalid or expired email verification token.');
  }

  async googleLogin(dto: GoogleLoginDto, metadata: AuthMetadata) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');

    if (!clientId) {
      throw new BadRequestException('Google OAuth is not configured.');
    }

    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Invalid Google token.');
    }

    const email = payload.email.toLowerCase().trim();
    const existingOauthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'google',
          providerUserId: payload.sub,
        },
      },
      include: {
        user: { include: { roles: { include: { role: true } } } },
      },
    });

    let user = existingOauthAccount?.user;

    if (!user) {
      user = await this.linkOrCreateGoogleUser(email, payload.sub, {
        firstName: payload.given_name ?? 'Utilisateur',
        lastName: payload.family_name ?? 'Google',
        photoUrl: payload.picture,
        emailVerified: payload.email_verified ?? false,
      });
    } else if (payload.email_verified && !user.emailVerifiedAt) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
        include: { roles: { include: { role: true } } },
      });
    }

    if (user.status === UserStatus.PENDING) {
      return {
        requiresApproval: true,
        message: 'Google account registered. Waiting for admin approval.',
        user: this.toPublicUser(user),
      };
    }

    this.ensureCanAuthenticate(user);

    if (user.twoFactorEnabled) {
      return this.createTwoFactorChallenge(user, metadata);
    }

    return this.completeLogin(user, dto.rememberMe, metadata, AuditAction.GOOGLE_LOGIN_SUCCESS);
  }

  async requestPhoneOtp(dto: RequestPhoneOtpDto) {
    const normalizedPhone = this.normalizePhone(dto.phone);
    const user = await this.findUserByNormalizedPhone(normalizedPhone);
    const message = 'If an active account matches this phone, an OTP has been sent.';

    if (!user || user.status === UserStatus.PENDING || user.status === UserStatus.DISABLED) {
      return { message };
    }

    const code = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + this.numberConfig('PHONE_OTP_MINUTES', 10) * 60 * 1000);
    const delivery = await this.sms.sendOtp(user.phone ?? dto.phone, code);

    await this.prisma.authChallenge.create({
      data: {
        userId: user.id,
        type: AuthChallengeType.PHONE_LOGIN,
        tokenHash: await this.passwords.hash(code),
        expiresAt,
        metadata: { phone: user.phone } as Prisma.InputJsonObject,
      },
    });
    await this.audit(user.id, AuditAction.PHONE_OTP_SENT, {}, { delivered: delivery.delivered });

    return {
      message,
      smsDelivered: delivery.delivered,
      developmentOtp: this.shouldExposeDevTokens() ? code : undefined,
      expiresAt,
    };
  }

  async verifyPhoneOtp(dto: VerifyPhoneOtpDto, metadata: AuthMetadata) {
    const normalizedPhone = this.normalizePhone(dto.phone);
    const challenges = await this.prisma.authChallenge.findMany({
      where: {
        type: AuthChallengeType.PHONE_LOGIN,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    for (const challenge of challenges) {
      if (this.normalizePhone(challenge.user.phone) !== normalizedPhone) {
        continue;
      }

      const matches = await this.passwords.compare(dto.code, challenge.tokenHash);

      if (!matches) {
        continue;
      }

      this.ensureCanAuthenticate(challenge.user);

      await this.prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { usedAt: new Date() },
      });
      const user = await this.prisma.user.update({
        where: { id: challenge.userId },
        data: { phoneVerifiedAt: new Date() },
        include: { roles: { include: { role: true } } },
      });

      return this.completeLogin(user, dto.rememberMe, metadata, AuditAction.PHONE_LOGIN_SUCCESS);
    }

    throw new UnauthorizedException('Invalid or expired phone OTP.');
  }

  async verifyTwoFactorLogin(dto: VerifyTwoFactorLoginDto, metadata: AuthMetadata) {
    const challenge = await this.prisma.authChallenge.findUnique({
      where: { id: dto.challengeId },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });

    if (
      !challenge ||
      challenge.type !== AuthChallengeType.LOGIN_2FA ||
      challenge.usedAt ||
      challenge.expiresAt <= new Date() ||
      !challenge.user.twoFactorEnabled ||
      !challenge.user.twoFactorSecret
    ) {
      throw new UnauthorizedException('Invalid or expired 2FA challenge.');
    }

    if (!this.verifyTotp(challenge.user.twoFactorSecret, dto.code)) {
      await this.audit(challenge.userId, AuditAction.LOGIN_FAILED, metadata, { reason: 'invalid-2fa' });
      throw new UnauthorizedException('Invalid 2FA code.');
    }

    await this.prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date() },
    });

    return this.completeLogin(challenge.user, dto.rememberMe, metadata, AuditAction.LOGIN_SUCCESS);
  }

  async setupTwoFactor(user: AuthenticatedUser) {
    this.ensureAdminUser(user);
    const dbUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.sub },
      include: { roles: { include: { role: true } } },
    });
    const secret = speakeasy.generateSecret({
      issuer: 'M Group',
      name: `M Group (${dbUser.email})`,
      length: 20,
    });

    await this.prisma.user.update({
      where: { id: user.sub },
      data: { twoFactorSecret: secret.base32 },
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      enabled: dbUser.twoFactorEnabled,
    };
  }

  async enableTwoFactor(user: AuthenticatedUser, dto: TwoFactorCodeDto) {
    this.ensureAdminUser(user);
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.sub } });

    if (!dbUser.twoFactorSecret || !this.verifyTotp(dbUser.twoFactorSecret, dto.code)) {
      throw new UnauthorizedException('Invalid 2FA code.');
    }

    await this.prisma.user.update({
      where: { id: user.sub },
      data: { twoFactorEnabled: true },
    });
    await this.audit(user.sub, AuditAction.TWO_FACTOR_ENABLED, {});

    return { message: 'Two-factor authentication enabled.' };
  }

  async disableTwoFactor(user: AuthenticatedUser, dto: TwoFactorCodeDto) {
    this.ensureAdminUser(user);
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.sub } });

    if (dbUser.twoFactorEnabled && (!dbUser.twoFactorSecret || !this.verifyTotp(dbUser.twoFactorSecret, dto.code))) {
      throw new UnauthorizedException('Invalid 2FA code.');
    }

    await this.prisma.user.update({
      where: { id: user.sub },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
    await this.audit(user.sub, AuditAction.TWO_FACTOR_DISABLED, {});

    return { message: 'Two-factor authentication disabled.' };
  }

  async refresh(refreshToken?: string, metadata: AuthMetadata = {}) {
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

      this.ensureCanAuthenticate(storedToken.user);

      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revokedAt: new Date(),
          lastUsedAt: new Date(),
        },
      });

      const tokens = await this.createSession(storedToken.user, storedToken.rememberMe, metadata);

      return {
        ...tokens,
        forcePasswordChange: storedToken.user.status === UserStatus.FORCE_PASSWORD_CHANGE,
        user: this.toPublicUser(storedToken.user),
      };
    }

    throw new UnauthorizedException('Invalid refresh token.');
  }

  async logout(refreshToken?: string, metadata: AuthMetadata = {}) {
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
        await this.audit(storedToken.userId, AuditAction.LOGOUT, metadata, { scope: 'current-session' });
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
      lastUsedAt: session.lastUsedAt,
      rememberMe: session.rememberMe,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
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
            AuditAction.LOGIN_FAILED,
            AuditAction.LOGOUT,
            AuditAction.PASSWORD_CHANGED,
            AuditAction.PASSWORD_RESET_REQUESTED,
            AuditAction.EMAIL_VERIFICATION_SENT,
            AuditAction.EMAIL_VERIFIED,
            AuditAction.PHONE_LOGIN_SUCCESS,
            AuditAction.GOOGLE_LOGIN_SUCCESS,
            AuditAction.TWO_FACTOR_CHALLENGE,
            AuditAction.TWO_FACTOR_ENABLED,
            AuditAction.TWO_FACTOR_DISABLED,
            AuditAction.ACCOUNT_LOCKED,
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
        lastPasswordChangedAt: new Date(),
      },
    });
    await this.audit(user.sub, AuditAction.PASSWORD_CHANGED, {});

    return { message: 'Password changed.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const message =
      'If an active account exists for this email, reset instructions have been sent.';

    if (!user || user.status === UserStatus.PENDING || user.status === UserStatus.DISABLED) {
      return { message };
    }

    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const resetUrl = this.clientUrl({ resetToken });
    const emailDelivery = await this.mail.sendPasswordReset(user.email, resetUrl, resetToken);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: await this.passwords.hash(resetToken),
        expiresAt,
      },
    });
    await this.audit(user.id, AuditAction.PASSWORD_RESET_REQUESTED, {}, { delivered: emailDelivery.delivered });

    return {
      message,
      emailDelivered: emailDelivery.delivered,
      developmentResetToken: this.shouldExposeDevTokens() ? resetToken : undefined,
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
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastPasswordChangedAt: new Date(),
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

  private async linkOrCreateGoogleUser(
    email: string,
    providerUserId: string,
    profile: { firstName: string; lastName: string; photoUrl?: string; emailVerified: boolean },
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (existingUser) {
      await this.prisma.oAuthAccount.create({
        data: {
          userId: existingUser.id,
          provider: 'google',
          providerUserId,
          email,
        },
      });

      if (profile.emailVerified && !existingUser.emailVerifiedAt) {
        return this.prisma.user.update({
          where: { id: existingUser.id },
          data: { emailVerifiedAt: new Date() },
          include: { roles: { include: { role: true } } },
        });
      }

      return existingUser;
    }

    const company = await this.prisma.company.findFirst();
    const user = await this.prisma.user.create({
      data: {
        companyId: company?.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email,
        photoUrl: profile.photoUrl,
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        status: UserStatus.PENDING,
        oauthAccounts: {
          create: {
            provider: 'google',
            providerUserId,
            email,
          },
        },
      },
      include: { roles: { include: { role: true } } },
    });

    await this.audit(user.id, AuditAction.USER_REGISTERED, {}, { source: 'google' });

    return user;
  }

  private async createEmailVerification(userId: string, email: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.numberConfig('EMAIL_VERIFICATION_HOURS', 24) * 60 * 60 * 1000);
    const verificationUrl = this.clientUrl({ verifyEmailToken: token });

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: await this.passwords.hash(token),
        expiresAt,
      },
    });

    const delivery = await this.mail.sendEmailVerification(email, verificationUrl);
    await this.audit(userId, AuditAction.EMAIL_VERIFICATION_SENT, {}, { delivered: delivery.delivered });

    return {
      token,
      emailDelivered: delivery.delivered,
      expiresAt,
    };
  }

  private async notifyAdminsAboutRegistration(user: User) {
    const admins = await this.prisma.user.findMany({
      where: {
        status: { not: UserStatus.DISABLED },
        roles: {
          some: {
            role: { name: RoleName.ADMIN },
          },
        },
      },
      select: { id: true, email: true },
    });

    for (const admin of admins) {
      const message = `${user.lastName} ${user.firstName} vient de demander un acces M Group.`;
      const delivery = await this.mail.send({
        to: admin.email,
        subject: 'Nouvelle inscription M Group',
        text: message,
        html: `<p>${message}</p>`,
      });

      await this.prisma.notification.create({
        data: {
          userId: admin.id,
          type: NotificationType.USER_REGISTERED,
          status: NotificationStatus.SENT,
          title: 'Nouvelle demande utilisateur',
          message,
          channels: ['IN_APP', 'EMAIL', 'SOUND'],
          actionUrl: '#validation',
          sentAt: new Date(),
          metadata: {
            pendingUserId: user.id,
            emailDelivered: delivery.delivered,
            reason: delivery.reason ?? null,
          },
        },
      });

      await this.audit(admin.id, AuditAction.NOTIFICATION_SENT, {}, {
        type: NotificationType.USER_REGISTERED,
        pendingUserId: user.id,
      });
    }
  }

  private async createTwoFactorChallenge(user: UserWithRoles, metadata: AuthMetadata) {
    const challenge = await this.prisma.authChallenge.create({
      data: {
        userId: user.id,
        type: AuthChallengeType.LOGIN_2FA,
        expiresAt: new Date(Date.now() + this.numberConfig('TWO_FACTOR_CHALLENGE_MINUTES', 10) * 60 * 1000),
        metadata: metadata as Prisma.InputJsonObject,
      },
    });

    await this.audit(user.id, AuditAction.TWO_FACTOR_CHALLENGE, metadata);

    return {
      requiresTwoFactor: true,
      challengeId: challenge.id,
      message: 'Two-factor authentication is required.',
      user: {
        email: user.email,
        roles: user.roles.map(({ role }) => ({ name: role.name, label: role.label })),
      },
    };
  }

  private async completeLogin(
    user: UserWithRoles,
    rememberMe = false,
    metadata: AuthMetadata,
    action: AuditAction,
  ) {
    const loggedInUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      include: { roles: { include: { role: true } } },
    });
    await this.audit(user.id, action, metadata);

    const tokens = await this.createSession(loggedInUser, rememberMe, metadata);

    return {
      ...tokens,
      forcePasswordChange: loggedInUser.status === UserStatus.FORCE_PASSWORD_CHANGE,
      user: this.toPublicUser(loggedInUser),
    };
  }

  private async createSession(user: UserWithRoles, rememberMe = false, metadata: AuthMetadata = {}) {
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
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        rememberMe,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  private async handleFailedLogin(user: UserWithRoles | null, email: string, metadata: AuthMetadata) {
    if (!user) {
      await this.audit(null, AuditAction.LOGIN_FAILED, metadata, { email });
      return;
    }

    const nextAttempts = user.failedLoginAttempts + 1;
    const maxAttempts = this.numberConfig('AUTH_MAX_LOGIN_ATTEMPTS', 5);
    const lockedUntil =
      nextAttempts >= maxAttempts
        ? new Date(Date.now() + this.numberConfig('AUTH_LOCK_MINUTES', 15) * 60 * 1000)
        : null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: nextAttempts,
        lockedUntil,
      },
    });
    await this.audit(user.id, AuditAction.LOGIN_FAILED, metadata, { email, attempts: nextAttempts });

    if (lockedUntil) {
      await this.audit(user.id, AuditAction.ACCOUNT_LOCKED, metadata, { lockedUntil });
    }
  }

  private ensureCanAuthenticate(user: User) {
    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException('User registration is pending admin approval.');
    }

    if (user.status === UserStatus.DISABLED) {
      throw new ForbiddenException('User account is disabled.');
    }
  }

  private ensureAdminUser(user: AuthenticatedUser) {
    if (!user.roles.includes(RoleName.ADMIN)) {
      throw new ForbiddenException('Two-factor setup is reserved for Admin users.');
    }
  }

  private async findUserByNormalizedPhone(normalizedPhone: string) {
    const users = await this.prisma.user.findMany({
      where: { phone: { not: null } },
      include: { roles: { include: { role: true } } },
    });

    return users.find((user) => this.normalizePhone(user.phone) === normalizedPhone) ?? null;
  }

  private normalizePhone(phone?: string | null) {
    return String(phone ?? '').replace(/[^\d]/g, '');
  }

  private verifyTotp(secret: string, code: string) {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
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
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      lockedUntil: user.lockedUntil,
      twoFactorEnabled: user.twoFactorEnabled,
      lastPasswordChangedAt: user.lastPasswordChangedAt,
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

  private shouldExposeDevTokens() {
    const configured = this.config.get<string>('AUTH_DEV_EXPOSE_TOKENS');

    if (configured === 'true') {
      return true;
    }

    if (configured === 'false') {
      return false;
    }

    return process.env.NODE_ENV !== 'production';
  }

  private clientUrl(params: Record<string, string>) {
    const url = new URL(this.config.get<string>('CLIENT_ORIGIN') ?? 'http://127.0.0.1:5173');
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  }

  private async audit(
    userId: string | null,
    action: AuditAction,
    metadata: AuthMetadata,
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
