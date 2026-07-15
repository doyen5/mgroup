import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@prisma/client';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../types/authenticated-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user ?? (await this.authenticateFromToken(request));

    if (!user) {
      throw new ForbiddenException('Authentication is required for this role.');
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role.');
    }

    return true;
  }

  private async authenticateFromToken(request: Request & { user?: AuthenticatedUser }) {
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing access token.');
    }

    try {
      // Le guard des roles est global et peut passer avant JwtAuthGuard ; on hydrate donc
      // request.user ici pour que les routes @Roles puissent valider l'utilisateur connecte.
      request.user = await this.jwt.verifyAsync<AuthenticatedUser>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret',
      });

      return request.user;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }

  private extractToken(request: Request) {
    const authorization = request.headers.authorization;

    if (authorization?.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length);
    }

    return (request as Request & { cookies?: Record<string, string> }).cookies?.accessToken;
  }
}
