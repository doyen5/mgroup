import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    // L'utilisateur lit uniquement ses alertes personnelles.
    return this.notifications.list(user);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthenticatedUser) {
    // Petit compteur exploitable par la cloche du dashboard.
    return this.notifications.unreadCount(user);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    // Action groupée pour traiter rapidement le panneau notifications.
    return this.notifications.markAllRead(user);
  }

  @Patch(':id/read')
  markRead(@Param('id') notificationId: string, @CurrentUser() user: AuthenticatedUser) {
    // La lecture est auditee pour garder la trace des alertes sensibles vues.
    return this.notifications.markRead(notificationId, user);
  }

  @Roles(RoleName.ADMIN)
  @Post('event-reminders')
  sendEventReminders(@CurrentUser() user: AuthenticatedUser) {
    // En production, cette action sera declenchee par un Cron ; ici l'Admin peut la lancer.
    return this.notifications.sendEventReminders(user);
  }
}
