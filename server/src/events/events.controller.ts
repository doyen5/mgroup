import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
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
import { EventsService } from './events.service';

@UseGuards(JwtAuthGuard)
@Roles(RoleName.ADMIN, RoleName.RH, RoleName.COMMERCIAL, RoleName.COMPTABLE, RoleName.SECRETAIRE)
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list() {
    return this.events.list();
  }

  @Post()
  @Roles(RoleName.ADMIN, RoleName.RH, RoleName.COMMERCIAL, RoleName.SECRETAIRE)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.events.create(user, dto);
  }

  @Get(':id')
  detail(@Param('id') eventId: string) {
    return this.events.detail(eventId);
  }

  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.RH, RoleName.SECRETAIRE)
  update(@Param('id') eventId: string, @Body() dto: UpdateEventDto) {
    return this.events.update(eventId, dto);
  }

  @Post(':id/assignments')
  @Roles(RoleName.ADMIN, RoleName.RH)
  assign(@Param('id') eventId: string, @Body() dto: CreateAssignmentDto) {
    return this.events.assign(eventId, dto);
  }

  @Delete(':id/assignments/:assignmentId')
  @Roles(RoleName.ADMIN, RoleName.RH)
  removeAssignment(@Param('assignmentId') assignmentId: string) {
    return this.events.removeAssignment(assignmentId);
  }

  @Post(':id/checklist')
  @Roles(RoleName.ADMIN, RoleName.RH, RoleName.SECRETAIRE)
  createChecklistItem(@Param('id') eventId: string, @Body() dto: CreateChecklistItemDto) {
    return this.events.createChecklistItem(eventId, dto);
  }

  @Patch(':id/checklist/:itemId')
  @Roles(RoleName.ADMIN, RoleName.RH, RoleName.SECRETAIRE)
  updateChecklistItem(@Param('itemId') itemId: string, @Body() dto: UpdateChecklistItemDto) {
    return this.events.updateChecklistItem(itemId, dto);
  }

  @Post(':id/production-steps')
  @Roles(RoleName.ADMIN, RoleName.RH)
  createProductionStep(@Param('id') eventId: string, @Body() dto: CreateProductionStepDto) {
    return this.events.createProductionStep(eventId, dto);
  }

  @Patch(':id/production-steps/:stepId')
  @Roles(RoleName.ADMIN, RoleName.RH)
  updateProductionStep(@Param('stepId') stepId: string, @Body() dto: UpdateProductionStepDto) {
    return this.events.updateProductionStep(stepId, dto);
  }

  @Post(':id/attachments')
  @Roles(RoleName.ADMIN, RoleName.RH, RoleName.COMMERCIAL, RoleName.COMPTABLE, RoleName.SECRETAIRE)
  createAttachment(@Param('id') eventId: string, @Body() dto: CreateAttachmentDto) {
    return this.events.createAttachment(eventId, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  @Roles(RoleName.ADMIN, RoleName.RH)
  removeAttachment(@Param('attachmentId') attachmentId: string) {
    return this.events.removeAttachment(attachmentId);
  }
}
