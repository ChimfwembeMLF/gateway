import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Audit } from './entities/audit.entity';

@Injectable()
export class AuditCleanupService {
  private readonly logger = new Logger(AuditCleanupService.name);

  constructor(
    @InjectRepository(Audit)
    private readonly auditRepository: Repository<Audit>,
  ) {}

  /**
   * Runs weekly on Sunday at 3 AM to delete old audit logs.
   * Keeps audit logs for 90 days, then deletes them.
   */
  @Cron('0 3 * * 0')
  async cleanupOldAudits(): Promise<void> {
    this.logger.log('Starting audit log cleanup job');

    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const result = await this.auditRepository.delete({
        createdAt: LessThan(ninetyDaysAgo),
      });

      if ((result.affected ?? 0) > 0) {
        this.logger.log(
          `Deleted ${result.affected} audit log(s) older than 90 days`,
        );
      } else {
        this.logger.debug('No old audit logs found to delete');
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup audit logs: ${error?.message ?? error}`,
        error?.stack,
      );
    }
  }
}
