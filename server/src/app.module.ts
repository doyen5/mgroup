import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CommercialModule } from './commercial/commercial.module';
import { RolesGuard } from './common/guards/roles.guard';
import { SecurityModule } from './common/security/security.module';
import { DocumentsModule } from './documents/documents.module';
import { EventsModule } from './events/events.module';
import { FinanceModule } from './finance/finance.module';
import { HrModule } from './hr/hr.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { SetupModule } from './setup/setup.module';
import { UsersModule } from './users/users.module';
import { WorkflowsModule } from './workflows/workflows.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['server/.env', '.env'],
    }),
    PrismaModule,
    SecurityModule,
    AuthModule,
    SetupModule,
    UsersModule,
    CommercialModule,
    EventsModule,
    FinanceModule,
    HrModule,
    DocumentsModule,
    ReportsModule,
    NotificationsModule,
    WorkflowsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
