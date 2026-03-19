import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}


  /**
   * Get settings by name (e.g., 'security', 'general')
   */
  async getSettingsByName(name: string): Promise<Record<string, any>> {
    const settings = await this.settingsRepository.findOne({ where: { name } });
    if (!settings) {
      throw new Error(`Settings '${name}' are missing. Please ensure settings are seeded.`);
    }
    return settings.value;
  }

  /**
   * Update settings by name
   */
  async updateSettingsByName(name: string, value: Record<string, any>): Promise<Settings> {
    let settings = await this.settingsRepository.findOne({ where: { name } });
    if (!settings) {
      settings = this.settingsRepository.create({ name, value });
    } else {
      settings.value = value;
    }
    return this.settingsRepository.save(settings);
  }

  // Optionally, add findOne by id if needed for admin or debugging
}