import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import {
  AddWorkflowBudgetDto,
  AssignWorkflowPeopleDto,
  CreateWorkflowRequestDto,
  WorkflowDecisionDto,
} from './dto/workflow.dto';
import { WorkflowsService } from './workflows.service';

@UseGuards(JwtAuthGuard)
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    // La liste est filtree selon le role pour eviter d'exposer toutes les demandes aux profils simples.
    return this.workflows.list(user);
  }

  @Get(':id')
  detail(@Param('id') workflowId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.workflows.detail(workflowId, user);
  }

  @Roles(RoleName.COMMERCIAL, RoleName.ADMIN)
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkflowRequestDto) {
    return this.workflows.create(user, dto);
  }

  @Roles(RoleName.COMPTABLE, RoleName.ADMIN)
  @Patch(':id/budget')
  addBudget(
    @Param('id') workflowId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddWorkflowBudgetDto,
  ) {
    return this.workflows.addBudget(workflowId, user, dto);
  }

  @Roles(RoleName.RH, RoleName.ADMIN)
  @Patch(':id/assignees')
  assignPeople(
    @Param('id') workflowId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AssignWorkflowPeopleDto,
  ) {
    return this.workflows.assignPeople(workflowId, user, dto);
  }

  @Roles(RoleName.ADMIN)
  @Patch(':id/approve')
  approve(
    @Param('id') workflowId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkflowDecisionDto,
  ) {
    return this.workflows.approve(workflowId, user, dto);
  }

  @Roles(RoleName.ADMIN)
  @Patch(':id/reject')
  reject(
    @Param('id') workflowId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: WorkflowDecisionDto,
  ) {
    return this.workflows.reject(workflowId, user, dto);
  }
}
