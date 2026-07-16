import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [FinanceController],
  providers: [FinanceService],
})
export class FinanceModule {}
