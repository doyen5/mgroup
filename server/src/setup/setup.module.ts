import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SetupController } from './setup.controller';
import { SetupService } from './setup.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
