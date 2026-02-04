import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';

@Injectable()
export class StalePaymentsCleanupService {
  private readonly logger = new Logger(StalePaymentsCleanupService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Runs daily at 2 AM to mark stale PENDING payments as FAILED.
   * A payment is considered stale if it's been PENDING for more than 24 hours.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupStalePayments(): Promise<void> {
    this.logger.log('Starting stale payments cleanup job');

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await this.paymentRepository
        .createQueryBuilder()
        .update(Payment)
        .set({ status: PaymentStatus.FAILED })
        .where('status = :status', { status: PaymentStatus.PENDING })
        .andWhere('createdAt < :cutoff', { cutoff: twentyFourHoursAgo })
        .execute();

      if (result.affected > 0) {
        this.logger.log(
          `Marked ${result.affected} stale payment(s) as FAILED (older than 24 hours)`,
        );
      } else {
        this.logger.debug('No stale payments found to clean up');
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup stale payments: ${error?.message ?? error}`,
        error?.stack,
      );
    }
  }
}
