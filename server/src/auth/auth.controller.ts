import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GoogleCodeLoginDto, GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RequestPhoneOtpDto } from './dto/request-phone-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { TwoFactorCodeDto, VerifyTwoFactorLoginDto } from './dto/two-factor.dto';
import { ResendEmailVerificationDto, VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(dto, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return this.completeAuthResponse(response, result);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.auth.verifyEmail(dto);
  }

  @Post('resend-email-verification')
  resendEmailVerification(@Body() dto: ResendEmailVerificationDto) {
    return this.auth.resendEmailVerification(dto);
  }

  @Post('google')
  async google(
    @Body() dto: GoogleLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.googleLogin(dto, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return this.completeAuthResponse(response, result);
  }

  @Post('google/code')
  async googleCode(
    @Body() dto: GoogleCodeLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    // Flux popup Google : le frontend donne un code court, le backend l'echange cote serveur.
    const result = await this.auth.googleCodeLogin(dto, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return this.completeAuthResponse(response, result);
  }

  @Post('phone/request-otp')
  requestPhoneOtp(@Body() dto: RequestPhoneOtpDto) {
    return this.auth.requestPhoneOtp(dto);
  }

  @Post('phone/verify-otp')
  async verifyPhoneOtp(
    @Body() dto: VerifyPhoneOtpDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.verifyPhoneOtp(dto, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return this.completeAuthResponse(response, result);
  }

  @Post('2fa/verify-login')
  async verifyTwoFactorLogin(
    @Body() dto: VerifyTwoFactorLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.verifyTwoFactorLogin(dto, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return this.completeAuthResponse(response, result);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = dto.refreshToken ?? this.getCookie(request, 'refreshToken');
    const result = await this.auth.refresh(refreshToken, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return this.completeAuthResponse(response, result);
  }

  @Post('logout')
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = dto.refreshToken ?? this.getCookie(request, 'refreshToken');
    const result = await this.auth.logout(refreshToken, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
    response.clearCookie('accessToken');
    response.clearCookie('refreshToken');
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  logoutAll(@CurrentUser() user: AuthenticatedUser) {
    // Action de securite : retire tous les refresh tokens du compte connecte.
    return this.auth.logoutAll(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  sessions(@CurrentUser() user: AuthenticatedUser) {
    // Liste les sessions recentes sans exposer les tokens stockes en base.
    return this.auth.sessions(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('login-history')
  loginHistory(@CurrentUser() user: AuthenticatedUser) {
    // Alimente l'historique de connexions dans Parametres > Securite.
    return this.auth.loginHistory(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.auth.setupTwoFactor(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  enableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorCodeDto) {
    return this.auth.enableTwoFactor(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  disableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorCodeDto) {
    return this.auth.disableTwoFactor(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  private getCookie(request: Request, name: string) {
    // cookie-parser ajoute `cookies` dynamiquement sur Request ; ce cast garde le typage explicite.
    return (request as Request & { cookies?: Record<string, string> }).cookies?.[name];
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
    refreshExpiresAt: Date,
  ) {
    const secure = process.env.NODE_ENV === 'production';

    response.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      maxAge: 15 * 60 * 1000,
    });
    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      expires: refreshExpiresAt,
    });
  }

  private completeAuthResponse(
    response: Response,
    result: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
      [key: string]: unknown;
    },
  ) {
    // Les flux qui demandent une validation admin ou 2FA ne recoivent pas encore de cookies.
    if (result.accessToken && result.refreshToken && result.expiresAt) {
      this.setAuthCookies(response, result.accessToken, result.refreshToken, result.expiresAt);
    }

    return result;
  }
}
