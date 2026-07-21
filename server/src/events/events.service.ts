import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssignmentDto,
  CreateAttachmentDto,
  CreateChecklistItemDto,
  CreateEventDto,
  CreateProductionStepDto,
  UpdateChecklistItemDto,
  UpdateEventDto,
  UpdateProductionStepDto,
} from './dto/event.dto';

const eventInclude = {
  responsible: {
    select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  assignments: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, photoUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  checklist: {
    orderBy: { createdAt: 'asc' as const },
  },
  steps: {
    include: {
      owner: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: [{ startsAt: 'asc' as const }, { createdAt: 'asc' as const }],
  },
  attachments: {
    orderBy: { createdAt: 'desc' as const },
  },
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.event.findMany({
      orderBy: { startsAt: 'asc' },
      include: eventInclude,
    });
  }

  async create(user: AuthenticatedUser, dto: CreateEventDto) {
    const company = await this.prisma.company.findFirst();

    // Un evenement regroupe planning, checklist, affectations et documents dans une seule fiche.
    return this.prisma.event.create({
      data: {
        companyId: company?.id,
        createdById: user.sub,
        title: dto.title.trim(),
        description: this.clean(dto.description),
        location: this.clean(dto.location),
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        budgetFcfa: dto.budgetFcfa,
        status: dto.status,
        responsibleId: dto.responsibleId,
      },
      include: eventInclude,
    });
  }

  async detail(eventId: string) {
    return this.findEvent(eventId);
  }

  async remove(eventId: string) {
    const event = await this.findEvent(eventId);

    // La suppression d'un evenement supprime aussi ses sous-elements Prisma en cascade.
    await this.prisma.event.delete({ where: { id: eventId } });

    return {
      deleted: true,
      id: event.id,
      title: event.title,
    };
  }

  async update(eventId: string, dto: UpdateEventDto) {
    await this.ensureEventExists(eventId);

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        title: this.clean(dto.title),
        description: this.clean(dto.description),
        location: this.clean(dto.location),
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        budgetFcfa: dto.budgetFcfa,
        status: dto.status,
        responsibleId: dto.responsibleId,
      },
      include: eventInclude,
    });
  }

  async assign(eventId: string, dto: CreateAssignmentDto) {
    await this.ensureEventExists(eventId);

    try {
      await this.prisma.eventAssignment.create({
        data: {
          eventId,
          userId: dto.userId,
          roleNote: this.clean(dto.roleNote),
        },
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('This user is already assigned to the event.');
      }

      throw error;
    }

    return this.findEvent(eventId);
  }

  async removeAssignment(assignmentId: string) {
    const assignment = await this.prisma.eventAssignment.findUnique({ where: { id: assignmentId } });

    if (!assignment) {
      throw new NotFoundException('Assignment not found.');
    }

    await this.prisma.eventAssignment.delete({ where: { id: assignmentId } });
    return this.findEvent(assignment.eventId);
  }

  async createChecklistItem(eventId: string, dto: CreateChecklistItemDto) {
    await this.ensureEventExists(eventId);
    await this.prisma.eventChecklistItem.create({
      data: {
        eventId,
        title: dto.title.trim(),
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });

    return this.findEvent(eventId);
  }

  async updateChecklistItem(itemId: string, dto: UpdateChecklistItemDto) {
    const item = await this.prisma.eventChecklistItem.findUnique({ where: { id: itemId } });

    if (!item) {
      throw new NotFoundException('Checklist item not found.');
    }

    await this.prisma.eventChecklistItem.update({
      where: { id: itemId },
      data: {
        title: this.clean(dto.title),
        isDone: dto.isDone,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      },
    });

    return this.findEvent(item.eventId);
  }

  async createProductionStep(eventId: string, dto: CreateProductionStepDto) {
    await this.ensureEventExists(eventId);
    const stepCount = await this.prisma.eventProductionStep.count({ where: { eventId } });

    await this.prisma.eventProductionStep.create({
      data: {
        eventId,
        title: dto.title.trim(),
        notes: this.clean(dto.notes),
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        status: dto.status,
        ownerId: dto.ownerId,
        order: stepCount + 1,
      },
    });

    return this.findEvent(eventId);
  }

  async updateProductionStep(stepId: string, dto: UpdateProductionStepDto) {
    const step = await this.prisma.eventProductionStep.findUnique({ where: { id: stepId } });

    if (!step) {
      throw new NotFoundException('Production step not found.');
    }

    await this.prisma.eventProductionStep.update({
      where: { id: stepId },
      data: {
        title: this.clean(dto.title),
        notes: this.clean(dto.notes),
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        status: dto.status,
        ownerId: dto.ownerId,
      },
    });

    return this.findEvent(step.eventId);
  }

  async createAttachment(eventId: string, dto: CreateAttachmentDto) {
    await this.ensureEventExists(eventId);
    await this.prisma.eventAttachment.create({
      data: {
        eventId,
        label: dto.label.trim(),
        url: dto.url,
        type: dto.type,
        fileName: this.clean(dto.fileName),
        mimeType: this.clean(dto.mimeType),
      },
    });

    return this.findEvent(eventId);
  }

  async removeAttachment(attachmentId: string) {
    const attachment = await this.prisma.eventAttachment.findUnique({ where: { id: attachmentId } });

    if (!attachment) {
      throw new NotFoundException('Attachment not found.');
    }

    await this.prisma.eventAttachment.delete({ where: { id: attachmentId } });
    return this.findEvent(attachment.eventId);
  }

  private async findEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: eventInclude,
    });

    if (!event) {
      throw new NotFoundException('Event not found.');
    }

    return event;
  }

  private async ensureEventExists(eventId: string) {
    const count = await this.prisma.event.count({ where: { id: eventId } });

    if (count === 0) {
      throw new NotFoundException('Event not found.');
    }
  }

  private clean(value?: string) {
    return value === undefined ? undefined : value.trim();
  }

  private isUniqueConstraintError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
