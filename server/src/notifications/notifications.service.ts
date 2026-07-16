import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  EventStatus,
  NotificationStatus,
  NotificationType,
  RoleName,
  UserStatus,
} from '@prisma/client';
import { MailService } from '../auth/mail.service';
import { SmsService } from '../auth/sms.service';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'SOUND';

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
  actionUrl?: string;
  scheduledFor?: Date;
  metadata?: Record<string, string | number | boolean | null>;
};

type NotificationRecipient = {
  id: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
    private readonly config: ConfigService,
  ) {}

  async list(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.sub },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async unreadCount(user: AuthenticatedUser) {
    const count = await this.prisma.notification.count({
      where: {
        userId: user.sub,
        readAt: null,
      },
    });

    return { count };
  }

  async markRead(notificationId: string, user: AuthenticatedUser) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: user.sub,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });

    await this.prisma.loginAuditLog.create({
      data: {
        userId: user.sub,
        action: AuditAction.NOTIFICATION_READ,
        metadata: { notificationId },
      },
    });

    return updated;
  }

  async notifyUser(userId: string, payload: NotificationPayload) {
    const recipient = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true },
    });

    if (!recipient) {
      throw new NotFoundException('Notification recipient not found.');
    }

    return this.createAndDeliver(recipient, payload);
  }

  async notifyRoles(roles: RoleName[], payload: NotificationPayload) {
    const recipients = await this.prisma.user.findMany({
      where: {
        status: { not: UserStatus.DISABLED },
        roles: {
          some: {
            role: { name: { in: roles } },
          },
        },
      },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true },
    });

    return Promise.all(recipients.map((recipient) => this.createAndDeliver(recipient, payload)));
  }

  async notifyAdmins(payload: NotificationPayload) {
    return this.notifyRoles([RoleName.ADMIN], payload);
  }

  async sendEventReminders(user: AuthenticatedUser) {
    const now = new Date();
    const hours = Number(this.config.get<string>('EVENT_REMINDER_HOURS') ?? 24);
    const until = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const events = await this.prisma.event.findMany({
      where: {
        startsAt: { gte: now, lte: until },
        status: { in: [EventStatus.IN_PREPARATION, EventStatus.VALIDATED] },
      },
      include: {
        responsible: {
          select: { id: true, email: true, phone: true, firstName: true, lastName: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, phone: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    const admins = await this.findAdmins();
    let createdCount = 0;

    for (const event of events) {
      const recipients = this.uniqueRecipients([
        ...admins,
        ...(event.responsible ? [event.responsible] : []),
        ...event.assignments.map((assignment) => assignment.user),
      ]);

      for (const recipient of recipients) {
        const alreadySent = await this.prisma.notification.count({
          where: {
            userId: recipient.id,
            type: NotificationType.EVENT_REMINDER,
            metadata: { path: ['eventId'], equals: event.id },
          },
        });

        if (alreadySent > 0) {
          continue;
        }

        await this.createAndDeliver(recipient, {
          type: NotificationType.EVENT_REMINDER,
          title: `Rappel evenement : ${event.title}`,
          message: `L'evenement ${event.title} commence le ${event.startsAt.toLocaleString('fr-FR')}.`,
          channels: ['IN_APP', 'EMAIL', 'SOUND'],
          actionUrl: '#events',
          scheduledFor: event.startsAt,
          metadata: { eventId: event.id },
        });
        createdCount += 1;
      }
    }

    await this.prisma.loginAuditLog.create({
      data: {
        userId: user.sub,
        action: AuditAction.NOTIFICATION_SENT,
        metadata: {
          type: NotificationType.EVENT_REMINDER,
          createdCount,
        },
      },
    });

    return { createdCount };
  }

  private async createAndDeliver(recipient: NotificationRecipient, payload: NotificationPayload) {
    const channels = payload.channels ?? ['IN_APP', 'SOUND'];
    const notification = await this.prisma.notification.create({
      data: {
        userId: recipient.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        channels,
        actionUrl: payload.actionUrl,
        scheduledFor: payload.scheduledFor,
        metadata: payload.metadata,
      },
    });

    const delivery = await this.deliver(recipient, payload, channels);
    const status = delivery.failed.length > 0 ? NotificationStatus.FAILED : NotificationStatus.SENT;

    await this.prisma.loginAuditLog.create({
      data: {
        userId: recipient.id,
        action: AuditAction.NOTIFICATION_SENT,
        metadata: {
          notificationId: notification.id,
          type: payload.type,
          channels: channels.join(','),
        },
      },
    });

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status,
        sentAt: new Date(),
        metadata: {
          ...(payload.metadata ?? {}),
          delivery,
          whatsappUrl: this.buildWhatsappUrl(recipient.phone, payload.message),
        },
      },
    });
  }

  private async deliver(
    recipient: NotificationRecipient,
    payload: NotificationPayload,
    channels: NotificationChannel[],
  ) {
    const delivery: {
      delivered: string[];
      failed: string[];
      reasons: Record<string, string>;
    } = {
      delivered: ['IN_APP'],
      failed: [],
      reasons: {},
    };

    if (channels.includes('EMAIL')) {
      try {
        const result = await this.mail.send({
          to: recipient.email,
          subject: payload.title,
          text: payload.message,
          html: `<p>${payload.message}</p>`,
        });
        this.recordDeliveryResult(delivery, 'EMAIL', result);
      } catch (error) {
        delivery.failed.push('EMAIL');
        delivery.reasons.EMAIL = error instanceof Error ? error.message : 'Email delivery failed.';
      }
    }

    if (channels.includes('SMS') && recipient.phone) {
      const result = await this.sms.sendMessage(recipient.phone, payload.message);
      this.recordDeliveryResult(delivery, 'SMS', result);
    }

    if (channels.includes('WHATSAPP')) {
      const whatsappUrl = this.buildWhatsappUrl(recipient.phone, payload.message);

      if (whatsappUrl) {
        delivery.delivered.push('WHATSAPP_LINK');
      } else {
        delivery.failed.push('WHATSAPP');
        delivery.reasons.WHATSAPP = 'No phone number available for WhatsApp.';
      }
    }

    if (channels.includes('SOUND')) {
      delivery.delivered.push('SOUND');
    }

    return delivery;
  }

  private recordDeliveryResult(
    delivery: { delivered: string[]; failed: string[]; reasons: Record<string, string> },
    channel: string,
    result: { delivered: boolean; reason?: string },
  ) {
    if (result.delivered) {
      delivery.delivered.push(channel);
      return;
    }

    delivery.failed.push(channel);
    delivery.reasons[channel] = result.reason ?? `${channel} is not configured.`;
  }

  private buildWhatsappUrl(phone?: string | null, message?: string) {
    if (!phone || !message) {
      return '';
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    return normalizedPhone ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}` : '';
  }

  private async findAdmins() {
    return this.prisma.user.findMany({
      where: {
        status: { not: UserStatus.DISABLED },
        roles: {
          some: {
            role: { name: RoleName.ADMIN },
          },
        },
      },
      select: { id: true, email: true, phone: true, firstName: true, lastName: true },
    });
  }

  private uniqueRecipients(recipients: NotificationRecipient[]) {
    return [...new Map(recipients.map((recipient) => [recipient.id, recipient])).values()];
  }
}
