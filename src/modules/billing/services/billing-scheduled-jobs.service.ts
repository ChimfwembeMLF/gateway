import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import {
  TenantBillingSubscription,
  Invoice,
  InvoiceStatus,
  UsageMetrics,
} from '../entities';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { InvoiceService } from './invoice.service';
import { EmailService } from '../../email/services/email.service';

/**
 * BillingScheduledJobsService
 * Handles scheduled billing operations:
 * - Monthly invoice generation
 * - Usage metrics cleanup
 * - Invoice email notifications
 */
@Injectable()
export class BillingScheduledJobsService {
  private readonly logger = new Logger(BillingScheduledJobsService.name);

  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(TenantBillingSubscription)
    private readonly subscriptionRepository: Repository<TenantBillingSubscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(UsageMetrics)
    private readonly usageMetricsRepository: Repository<UsageMetrics>,
    private readonly invoiceService: InvoiceService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Generate monthly invoices
   * Runs at 2 AM on the 1st of every month
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_NOON)
  async generateMonthlyInvoices(): Promise<void> {
    this.logger.log('Starting monthly invoice generation job...');

    try {
      // Get all active subscriptions
      const subscriptions = await this.subscriptionRepository.find({
        where: { isActive: true },
        relations: ['tenant'],
      });

      this.logger.log(`Found ${subscriptions.length} active subscriptions to invoice`);

      let successCount = 0;
      let errorCount = 0;

      for (const subscription of subscriptions) {
        try {
          // Calculate previous month's billing period
          const now = new Date();
          const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
          const billingPeriodStart = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
          const billingPeriodEnd = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

          // Check if invoice already exists for this period
          const existingInvoice = await this.invoiceRepository.findOne({
            where: {
              tenantId: subscription.tenantId,
              billingPeriodStart,
              billingPeriodEnd,
            },
          });

          if (existingInvoice) {
            this.logger.debug(`Invoice already exists for tenant ${subscription.tenantId}`);
            continue;
          }

          // Generate invoice
          const invoice = await this.invoiceService.generateInvoice({
            tenantId: subscription.tenantId,
            billingPeriodStart: billingPeriodStart.toISOString().split('T')[0],
            billingPeriodEnd: billingPeriodEnd.toISOString().split('T')[0],
            taxRate: 0,
          });

          // Send email notification
          if (subscription.tenant && 'email' in subscription.tenant) {
            await this.emailService.sendInvoiceNotification(
              (subscription.tenant as any).email,
              subscription.tenant.name || 'Tenant',
              invoice,
            );
          }

          successCount++;
          this.logger.log(
            `Successfully generated invoice ${invoice.invoiceNumber} for tenant ${subscription.tenantId}`,
          );
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Error generating invoice for tenant ${subscription.tenantId}: ${error.message}`,
            error,
          );
        }
      }

      this.logger.log(
        `Monthly invoice generation completed. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error(`Error during monthly invoice generation: ${error.message}`, error);
    }
  }

  /**
   * Clean up old usage metrics
   * Runs daily at 3 AM - keeps only last 90 days
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldUsageMetrics(): Promise<void> {
    this.logger.log('Starting usage metrics cleanup job...');

    try {
      const daysToKeep = 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.usageMetricsRepository.delete({
        createdAt: LessThan(cutoffDate),
      });

      if (result.affected && result.affected > 0) {
        this.logger.log(
          `Deleted ${result.affected} old usage metric records (older than ${daysToKeep} days)`,
        );
      } else {
        this.logger.log('No old usage metrics to clean up');
      }
    } catch (error) {
      this.logger.error(`Error during usage metrics cleanup: ${error.message}`, error);
    }
  }

  /**
   * Clean up expired subscriptions
   * Runs daily at 4 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupExpiredSubscriptions(): Promise<void> {
    this.logger.log('Starting expired subscriptions cleanup job...');

    try {
      const now = new Date();

      const result = await this.subscriptionRepository.update(
        {
          isActive: true,
          expiresAt: LessThan(now),
        },
        {
          isActive: false,
        },
      );

      if (result.affected && result.affected > 0) {
        this.logger.log(`Deactivated ${result.affected} expired subscriptions`);
      } else {
        this.logger.log('No expired subscriptions to deactivate');
      }
    } catch (error) {
      this.logger.error(`Error during expired subscriptions cleanup: ${error.message}`, error);
    }
  }

  /**
   * Send invoice reminders for unpaid invoices due in 3 days
   * Runs daily at 10 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async sendInvoiceReminders(): Promise<void> {
    this.logger.log('Starting invoice reminder job...');

    try {
      const today = new Date();
      const dueIn3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

      // Find pending invoices
      const dueSoonInvoices = await this.invoiceRepository.find({
        where: {
          status: InvoiceStatus.PENDING,
        },
        relations: ['tenant'],
      });

      // Filter invoices due in next 3 days
      const filteredInvoices = dueSoonInvoices.filter(
        (invoice) => invoice.dueDate <= dueIn3Days,
      );

      this.logger.log(`Found ${filteredInvoices.length} invoices due soon`);

      let sentCount = 0;

      for (const invoice of filteredInvoices) {
        try {
          if (invoice.tenant && 'email' in invoice.tenant) {
            await this.emailService.sendInvoiceReminder(
              (invoice.tenant as any).email,
              invoice.tenant.name || 'Tenant',
              invoice,
            );
            sentCount++;
          }
        } catch (error) {
          this.logger.error(
            `Error sending reminder for invoice ${invoice.invoiceNumber}: ${error.message}`,
            error,
          );
        }
      }

      this.logger.log(`Sent ${sentCount} invoice reminders`);
    } catch (error) {
      this.logger.error(`Error during invoice reminder job: ${error.message}`, error);
    }
  }
}
