import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialController } from './commercial.controller';
import { CommercialService } from './commercial.service';

@Module({
  imports: [JwtModule.register({}), PrismaModule, NotificationsModule],
  controllers: [CommercialController],
  providers: [CommercialService],
  exports: [CommercialService],
})
export class CommercialModule {}
