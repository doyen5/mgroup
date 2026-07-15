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
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
    this.setAuthCookies(response, result.accessToken, result.refreshToken, result.expiresAt);
    return result;
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
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
    const result = await this.auth.refresh(refreshToken);
    this.setAuthCookies(response, result.accessToken, result.refreshToken, result.expiresAt);
    return result;
  }

  @Post('logout')
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = dto.refreshToken ?? this.getCookie(request, 'refreshToken');
    const result = await this.auth.logout(refreshToken);
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
}
