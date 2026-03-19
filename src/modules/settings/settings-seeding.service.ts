import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';

@Injectable()
export class SettingsSeedingService {
  private readonly logger = new Logger(SettingsSeedingService.name);

  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  /**
   * Seed default system settings if not present
   */
  async seedSettings(): Promise<void> {
    try {
      this.logger.log('Checking if system settings need to be seeded...');
      // Seed security settings
      const security = await this.settingsRepository.findOne({ where: { name: 'security' } });
      if (!security) {
        await this.settingsRepository.save(
          this.settingsRepository.create({
            name: 'security',
            value: {
              require2FA: true,
              passwordMinLength: 8,
              sessionTimeoutMinutes: 30,
            },
          })
        );
        this.logger.log('Seeded default security settings.');
      }
      // Seed general settings
      const general = await this.settingsRepository.findOne({ where: { name: 'general' } });
      if (!general) {
        await this.settingsRepository.save(
          this.settingsRepository.create({
            name: 'general',
            value: {
              defaultCurrency: 'USD',
              standardFeePercent: 2.5,
              notifyAdmins: true,
              notifyUsers: false,
            },
          })
        );
        this.logger.log('Seeded default general settings.');
      }
    } catch (error) {
      this.logger.error(`Error seeding system settings: ${error.message}`, error);
      // Don't throw - allow app to start even if seeding fails
    }
  }
}
