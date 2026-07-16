import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { ExportReportDto, ReportPeriodDto } from './dto/report.dto';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Roles(RoleName.ADMIN, RoleName.COMPTABLE, RoleName.COMMERCIAL)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(@Query() query: ReportPeriodDto) {
    // Rapport global filtre par periode : finances, evenements, activite et performance commerciale.
    return this.reports.summary(query);
  }

  @Post('export')
  export(@CurrentUser() user: AuthenticatedUser, @Body() dto: ExportReportDto) {
    return this.reports.export(user, dto);
  }
}
