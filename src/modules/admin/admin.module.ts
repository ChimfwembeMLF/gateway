import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { SettingsModule } from '../settings/settings.module';
import { AuditModule } from '../audit/audit.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [SettingsModule, AuditModule, UserModule],
  controllers: [AdminController],
})
export class AdminModule {}
