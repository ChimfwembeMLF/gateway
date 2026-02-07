import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentFlow, PaymentStatus } from './entities/payment.entity';
import { CollectionService } from '../mtn/collection/collection.service';

@Injectable()
export class PaymentsStatusCronService {
  private readonly logger = new Logger(PaymentsStatusCronService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly collectionService: CollectionService,
  ) {}

  // @Cron(CronExpression.EVERY_30_SECONDS)
  async pollPendingCollectionPayments(): Promise<void> {
    const pending = await this.paymentRepository.find({
      where: { status: PaymentStatus.PENDING, flow: PaymentFlow.COLLECTION },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    if (!pending.length) return;

    this.logger.debug(`Polling ${pending.length} pending collection payments`);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const payment of pending) {
      const transactionId = payment.momoTransactionId || payment.externalId;
      if (!transactionId || !uuidRegex.test(transactionId)) {
        this.logger.warn(
          `Skipping poll for payment ${payment.externalId}: invalid or non-UUID referenceId`,
        );
        continue;
      }
      try {
        await this.collectionService.getRequestToPayStatus(transactionId, payment.tenantId, null);
      } catch (error) {
        this.logger.warn(
          `Failed to poll payment ${payment.externalId}: ${error?.message ?? error}`,
        );
      }
    }
  }
}
