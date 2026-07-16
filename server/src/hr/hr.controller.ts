import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import {
  CreateStaffContractDto,
  CreateStaffDocumentDto,
  CreateStaffMissionDto,
  UpsertStaffProfileDto,
} from './dto/hr.dto';
import { HrService } from './hr.service';

@UseGuards(JwtAuthGuard)
@Roles(RoleName.RH, RoleName.ADMIN)
@Controller('hr')
export class HrController {
  constructor(private readonly hr: HrService) {}

  @Get('overview')
  overview() {
    // Vue principale du dashboard RH : compteurs et liste enrichie du personnel.
    return this.hr.overview();
  }

  @Get('staff')
  staff() {
    // Liste du personnel accessible a la RH sans exposer les routes Admin de gestion utilisateurs.
    return this.hr.staff();
  }

  @Patch('staff/:userId/profile')
  upsertProfile(
    @Param('userId') userId: string,
    @Body() dto: UpsertStaffProfileDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.hr.upsertProfile(userId, dto, actor);
  }

  @Post('staff/:userId/contracts')
  createContract(
    @Param('userId') userId: string,
    @Body() dto: CreateStaffContractDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.hr.createContract(userId, dto, actor);
  }

  @Post('staff/:userId/documents')
  createDocument(
    @Param('userId') userId: string,
    @Body() dto: CreateStaffDocumentDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.hr.createDocument(userId, dto, actor);
  }

  @Post('staff/:userId/missions')
  createMission(
    @Param('userId') userId: string,
    @Body() dto: CreateStaffMissionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.hr.createMission(userId, dto, actor);
  }
}
