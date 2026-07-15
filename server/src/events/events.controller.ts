import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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
@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list() {
    return this.events.list();
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.events.create(user, dto);
  }

  @Get(':id')
  detail(@Param('id') eventId: string) {
    return this.events.detail(eventId);
  }

  @Patch(':id')
  update(@Param('id') eventId: string, @Body() dto: UpdateEventDto) {
    return this.events.update(eventId, dto);
  }

  @Post(':id/assignments')
  assign(@Param('id') eventId: string, @Body() dto: CreateAssignmentDto) {
    return this.events.assign(eventId, dto);
  }

  @Delete(':id/assignments/:assignmentId')
  removeAssignment(@Param('assignmentId') assignmentId: string) {
    return this.events.removeAssignment(assignmentId);
  }

  @Post(':id/checklist')
  createChecklistItem(@Param('id') eventId: string, @Body() dto: CreateChecklistItemDto) {
    return this.events.createChecklistItem(eventId, dto);
  }

  @Patch(':id/checklist/:itemId')
  updateChecklistItem(@Param('itemId') itemId: string, @Body() dto: UpdateChecklistItemDto) {
    return this.events.updateChecklistItem(itemId, dto);
  }

  @Post(':id/production-steps')
  createProductionStep(@Param('id') eventId: string, @Body() dto: CreateProductionStepDto) {
    return this.events.createProductionStep(eventId, dto);
  }

  @Patch(':id/production-steps/:stepId')
  updateProductionStep(@Param('stepId') stepId: string, @Body() dto: UpdateProductionStepDto) {
    return this.events.updateProductionStep(stepId, dto);
  }

  @Post(':id/attachments')
  createAttachment(@Param('id') eventId: string, @Body() dto: CreateAttachmentDto) {
    return this.events.createAttachment(eventId, dto);
  }

  @Delete(':id/attachments/:attachmentId')
  removeAttachment(@Param('attachmentId') attachmentId: string) {
    return this.events.removeAttachment(attachmentId);
  }
}
