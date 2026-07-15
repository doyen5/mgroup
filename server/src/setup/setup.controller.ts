import { Body, Controller, Get, Post } from '@nestjs/common';
import { CompanyAdminSetupDto } from './dto/company-admin-setup.dto';
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
}
