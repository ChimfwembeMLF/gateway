import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentFlow, PaymentStatus } from './entities/payment.entity';
import { PaymentsService } from './payments.service';

@Injectable()
export class PaymentsStatusCronService {
  private readonly logger = new Logger(PaymentsStatusCronService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @Inject(forwardRef(() => PaymentsService))
    private readonly paymentsService: any,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async pollPendingCollectionPayments(): Promise<void> {
    const pending = await this.paymentRepository.find({
      where: { status: PaymentStatus.PENDING, flow: PaymentFlow.COLLECTION },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    if (!pending.length) return;

    this.logger.debug(`Polling ${pending.length} pending deposits payments`);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const payment of pending) {
      const transactionId = payment.providerTransactionId || payment.externalId;
      if (!transactionId || !uuidRegex.test(transactionId)) {
        this.logger.warn(
          `Skipping poll for payment ${payment.externalId}: invalid or non-UUID referenceId`,
        );
        continue;
      }
      try {
        // Call pawaPay checkDepositStatus via PaymentsService
        const statusResult = await this.paymentsService.checkDepositStatus({ depositId: transactionId });
        const pawapayStatus = statusResult?.status;
        let newStatus: PaymentStatus = PaymentStatus.PENDING;
        if (pawapayStatus === 'COMPLETED') {
          newStatus = PaymentStatus.SUCCESSFUL;
        } else if (pawapayStatus === 'REJECTED' || pawapayStatus === 'FAILED') {
          newStatus = PaymentStatus.FAILED;
        }
        if (payment.status !== newStatus) {
          await this.paymentsService.updateStatus(payment.id, newStatus, payment.tenantId);
          this.logger.log(`Updated payment ${payment.externalId} status to ${newStatus} (pawaPay: ${pawapayStatus})`);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to poll payment ${payment.externalId}: ${error?.message ?? error}`,
        );
      }
    }
  }
}
