import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { CompanyAdminSetupDto } from './dto/company-admin-setup.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { SetupService } from './setup.service';

@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get('status')
  status() {
    return this.setup.status();
  }

  @Post('company-admin')
  createCompanyAndAdmin(@Body() dto: CompanyAdminSetupDto) {
    return this.setup.createCompanyAndAdmin(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(RoleName.ADMIN)
  @Get('company')
  company() {
    // Lecture des parametres entreprise depuis le panneau Admin.
    return this.setup.company();
  }

  @UseGuards(JwtAuthGuard)
  @Roles(RoleName.ADMIN)
  @Patch('company')
  updateCompany(@Body() dto: UpdateCompanyDto, @CurrentUser() admin: AuthenticatedUser) {
    // Modification reservee a l'admin pour eviter qu'un autre role change l'identite M Group.
    return this.setup.updateCompany(dto, admin);
  }
}
