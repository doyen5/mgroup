import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [HrController],
  providers: [HrService],
})
export class HrModule {}
