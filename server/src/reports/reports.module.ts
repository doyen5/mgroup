import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [JwtModule.register({}), PrismaModule, NotificationsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
