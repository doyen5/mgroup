import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  NotificationType,
  RoleName,
  WorkflowActionType,
  WorkflowStatus,
} from '@prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddWorkflowBudgetDto,
  AssignWorkflowPeopleDto,
  CreateWorkflowRequestDto,
  WorkflowDecisionDto,
} from './dto/workflow.dto';

const workflowInclude = {
  event: {
    select: { id: true, title: true, startsAt: true, location: true, status: true },
  },
  requester: {
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, photoUrl: true },
  },
  assignees: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true, photoUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  actions: {
    include: {
      actor: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

const workflowManagerRoles = new Set<RoleName>([RoleName.ADMIN, RoleName.COMPTABLE, RoleName.RH]);

@Injectable()
export class WorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(user: AuthenticatedUser) {
    const canSeeAll = user.roles.some((role) => workflowManagerRoles.has(role));

    return this.prisma.workflowRequest.findMany({
      where: canSeeAll
        ? undefined
        : {
            OR: [
              { requesterId: user.sub },
              { assignees: { some: { userId: user.sub } } },
            ],
          },
      include: workflowInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async detail(workflowId: string, user: AuthenticatedUser) {
    const workflow = await this.findWorkflow(workflowId);
    const canSeeAll = user.roles.some((role) => workflowManagerRoles.has(role));
    const isParticipant =
      workflow.requesterId === user.sub || workflow.assignees.some((item) => item.userId === user.sub);

    if (!canSeeAll && !isParticipant) {
      throw new NotFoundException('Workflow not found.');
    }

    return workflow;
  }

  async create(user: AuthenticatedUser, dto: CreateWorkflowRequestDto) {
    if (dto.eventId) {
      await this.ensureEventExists(dto.eventId);
    }

    const workflow = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workflowRequest.create({
        data: {
          eventId: this.clean(dto.eventId),
          requesterId: user.sub,
          title: dto.title.trim(),
          description: this.clean(dto.description),
          status: WorkflowStatus.PENDING_BUDGET,
        },
      });

      await tx.workflowAction.create({
        data: {
          requestId: created.id,
          actorId: user.sub,
          action: WorkflowActionType.CREATED,
          note: 'Demande creee par le Commercial.',
        },
      });

      await tx.loginAuditLog.create({
        data: {
          userId: user.sub,
          action: AuditAction.WORKFLOW_CREATED,
          metadata: { workflowId: created.id, title: created.title },
        },
      });

      return created;
    });

    await this.notifications.notifyRoles([RoleName.COMPTABLE, RoleName.ADMIN], {
      type: NotificationType.WORKFLOW_UPDATED,
      title: 'Nouvelle demande a budgeter',
      message: `${workflow.title} attend le budget du Comptable.`,
      channels: ['IN_APP', 'EMAIL', 'SOUND'],
      actionUrl: '#workflows',
      metadata: { workflowId: workflow.id },
    });

    return this.findWorkflow(workflow.id);
  }

  async addBudget(workflowId: string, user: AuthenticatedUser, dto: AddWorkflowBudgetDto) {
    await this.ensureWorkflowExists(workflowId);

    await this.prisma.$transaction(async (tx) => {
      await tx.workflowRequest.update({
        where: { id: workflowId },
        data: {
          budgetAmountFcfa: dto.budgetAmountFcfa,
          budgetNotes: this.clean(dto.budgetNotes),
          status: WorkflowStatus.PENDING_RH,
        },
      });

      await tx.workflowAction.create({
        data: {
          requestId: workflowId,
          actorId: user.sub,
          action: WorkflowActionType.BUDGET_ADDED,
          note: 'Budget ajoute par le Comptable.',
          metadata: { budgetAmountFcfa: dto.budgetAmountFcfa },
        },
      });

      await tx.loginAuditLog.create({
        data: {
          userId: user.sub,
          action: AuditAction.WORKFLOW_BUDGET_ADDED,
          metadata: { workflowId, budgetAmountFcfa: dto.budgetAmountFcfa },
        },
      });
    });

    const workflow = await this.findWorkflow(workflowId);
    await this.notifications.notifyRoles([RoleName.RH, RoleName.ADMIN], {
      type: NotificationType.WORKFLOW_UPDATED,
      title: 'Affectation RH attendue',
      message: `${workflow.title} a un budget et attend les personnes responsables.`,
      channels: ['IN_APP', 'EMAIL', 'SOUND'],
      actionUrl: '#workflows',
      metadata: { workflowId },
    });

    return workflow;
  }

  async assignPeople(workflowId: string, user: AuthenticatedUser, dto: AssignWorkflowPeopleDto) {
    if (!dto.assignees?.length) {
      throw new BadRequestException('At least one assignee is required.');
    }

    await this.ensureWorkflowExists(workflowId);
    await this.ensureUsersExist(dto.assignees.map((assignee) => assignee.userId));

    await this.prisma.$transaction(async (tx) => {
      await tx.workflowAssignee.deleteMany({ where: { requestId: workflowId } });
      await tx.workflowAssignee.createMany({
        data: dto.assignees.map((assignee) => ({
          requestId: workflowId,
          userId: assignee.userId,
          roleNote: this.clean(assignee.roleNote),
        })),
        skipDuplicates: true,
      });

      await tx.workflowRequest.update({
        where: { id: workflowId },
        data: {
          status: WorkflowStatus.PENDING_ADMIN,
          submittedAt: new Date(),
        },
      });

      await tx.workflowAction.create({
        data: {
          requestId: workflowId,
          actorId: user.sub,
          action: WorkflowActionType.PEOPLE_ASSIGNED,
          note: 'Responsables affectes par la RH.',
          metadata: { assigneeCount: dto.assignees.length },
        },
      });

      await tx.loginAuditLog.create({
        data: {
          userId: user.sub,
          action: AuditAction.WORKFLOW_PEOPLE_ASSIGNED,
          metadata: { workflowId, assigneeCount: dto.assignees.length },
        },
      });
    });

    const workflow = await this.findWorkflow(workflowId);
    await this.notifications.notifyAdmins({
      type: NotificationType.WORKFLOW_UPDATED,
      title: 'Validation Admin attendue',
      message: `${workflow.title} est pret pour validation ou refus par l'Admin.`,
      channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP', 'SOUND'],
      actionUrl: '#workflows',
      metadata: { workflowId },
    });

    return workflow;
  }

  async approve(workflowId: string, user: AuthenticatedUser, dto: WorkflowDecisionDto) {
    const workflow = await this.changeDecision(
      workflowId,
      user,
      WorkflowStatus.APPROVED,
      WorkflowActionType.APPROVED,
      AuditAction.WORKFLOW_APPROVED,
      dto.note,
    );

    await this.notifyParticipants(workflowId, {
      type: NotificationType.WORKFLOW_UPDATED,
      title: 'Demande validee',
      message: `${workflow.title} a ete validee par l'Admin.`,
      channels: ['IN_APP', 'EMAIL', 'SOUND'],
      actionUrl: '#workflows',
      metadata: { workflowId },
    });

    return workflow;
  }

  async reject(workflowId: string, user: AuthenticatedUser, dto: WorkflowDecisionDto) {
    const workflow = await this.changeDecision(
      workflowId,
      user,
      WorkflowStatus.REJECTED,
      WorkflowActionType.REJECTED,
      AuditAction.WORKFLOW_REJECTED,
      dto.note,
    );

    await this.notifyParticipants(workflowId, {
      type: NotificationType.WORKFLOW_UPDATED,
      title: 'Demande refusee',
      message: `${workflow.title} a ete refusee par l'Admin.`,
      channels: ['IN_APP', 'EMAIL', 'SOUND'],
      actionUrl: '#workflows',
      metadata: { workflowId },
    });

    return workflow;
  }

  private async changeDecision(
    workflowId: string,
    user: AuthenticatedUser,
    status: WorkflowStatus,
    workflowAction: WorkflowActionType,
    auditAction: AuditAction,
    note?: string,
  ) {
    await this.ensureWorkflowExists(workflowId);

    await this.prisma.$transaction(async (tx) => {
      await tx.workflowRequest.update({
        where: { id: workflowId },
        data: {
          status,
          adminNote: this.clean(note),
          decidedAt: new Date(),
        },
      });

      await tx.workflowAction.create({
        data: {
          requestId: workflowId,
          actorId: user.sub,
          action: workflowAction,
          note: this.clean(note),
        },
      });

      await tx.loginAuditLog.create({
        data: {
          userId: user.sub,
          action: auditAction,
          metadata: { workflowId },
        },
      });
    });

    return this.findWorkflow(workflowId);
  }

  private async notifyParticipants(
    workflowId: string,
    payload: Parameters<NotificationsService['notifyUser']>[1],
  ) {
    const workflow = await this.prisma.workflowRequest.findUnique({
      where: { id: workflowId },
      include: { assignees: true },
    });

    if (!workflow) {
      return;
    }

    const recipientIds = [
      workflow.requesterId,
      ...workflow.assignees.map((assignee) => assignee.userId),
    ].filter((id): id is string => Boolean(id));

    for (const userId of [...new Set(recipientIds)]) {
      await this.notifications.notifyUser(userId, payload);
    }
  }

  private async findWorkflow(workflowId: string) {
    const workflow = await this.prisma.workflowRequest.findUnique({
      where: { id: workflowId },
      include: workflowInclude,
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found.');
    }

    return workflow;
  }

  private async ensureWorkflowExists(workflowId: string) {
    const count = await this.prisma.workflowRequest.count({ where: { id: workflowId } });

    if (count === 0) {
      throw new NotFoundException('Workflow not found.');
    }
  }

  private async ensureEventExists(eventId: string) {
    const count = await this.prisma.event.count({ where: { id: eventId } });

    if (count === 0) {
      throw new NotFoundException('Event not found.');
    }
  }

  private async ensureUsersExist(userIds: string[]) {
    const uniqueIds = [...new Set(userIds)];
    const foundCount = await this.prisma.user.count({ where: { id: { in: uniqueIds } } });

    if (foundCount !== uniqueIds.length) {
      throw new NotFoundException('One or more assignees were not found.');
    }
  }

  private clean(value?: string) {
    return value === undefined ? undefined : value.trim();
  }
}
