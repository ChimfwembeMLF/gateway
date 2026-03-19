import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settings } from './entities/settings.entity';

import { SettingsService } from './settings.service';
import { SettingsSeedingService } from './settings-seeding.service';

@Module({
  imports: [TypeOrmModule.forFeature([Settings])],
  providers: [SettingsService, SettingsSeedingService],
  exports: [SettingsService, SettingsSeedingService],
})
export class SettingsModule {}
