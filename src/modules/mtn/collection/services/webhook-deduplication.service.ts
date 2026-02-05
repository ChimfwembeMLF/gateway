import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { WebhookLog } from '../entities/webhook-log.entity';

/**
 * Webhook Deduplication Service
 * 
 * Detects and handles duplicate webhook notifications from MTN.
 * MTN may retry webhooks if they don't receive a successful response,
 * causing duplicate notifications. This service ensures idempotent processing.
 */
@Injectable()
export class WebhookDeduplicationService {
  private readonly logger = new Logger(WebhookDeduplicationService.name);

  constructor(
    @InjectRepository(WebhookLog)
    private readonly webhookLogRepository: Repository<WebhookLog>,
  ) {}

  /**
   * Check if webhook has already been processed
   * 
   * @param transactionId The unique transaction ID from the webhook
   * @returns true if duplicate, false if new
   */
  async isDuplicate(transactionId: string): Promise<boolean> {
    const existing = await this.webhookLogRepository.findOne({
      where: { transactionId },
    });
    return !!existing;
  }

  /**
   * Log webhook for future deduplication
   * 
   * @param transactionId The unique transaction ID
   * @param payload The webhook payload
   * @param signature The webhook signature
   * @param status The processing status
   * @param result Optional result data
   * @param error Optional error message
   */
  async logWebhook(
    transactionId: string,
    payload: any,
    signature: string,
    status: 'PENDING' | 'PROCESSED' | 'FAILED' | 'SKIPPED',
    result?: any,
    error?: string,
  ): Promise<WebhookLog> {
    const webhookLog = new WebhookLog();
    webhookLog.transactionId = transactionId;
    webhookLog.payload = payload;
    webhookLog.signature = signature;
    webhookLog.status = status as any;
    webhookLog.result = result;
    webhookLog.error = error || null;
    webhookLog.processedAt =
      status === 'PROCESSED' ? new Date() : null;

    return this.webhookLogRepository.save(webhookLog);
  }

  /**
   * Update webhook log with processing result
   * 
   * @param transactionId The transaction ID
   * @param status The new status
   * @param result Optional result data
   * @param error Optional error message
   */
  async updateWebhookLog(
    transactionId: string,
    status: 'PROCESSED' | 'FAILED' | 'SKIPPED',
    result?: any,
    error?: string,
  ): Promise<void> {
    await this.webhookLogRepository.update(
      { transactionId },
      {
        status: status as any,
        result,
        error: error || null,
        processedAt: status === 'PROCESSED' ? new Date() : null,
      },
    );
  }

  /**
   * Get webhook processing history for a transaction
   * 
   * @param transactionId The transaction ID
   * @returns Array of webhook logs
   */
  async getWebhookHistory(transactionId: string): Promise<WebhookLog[]> {
    return this.webhookLogRepository.find({
      where: { transactionId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cleanup old webhook logs (older than 30 days)
   * Call this periodically via scheduled task
   */
  async cleanupOldWebhooks(): Promise<void> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.webhookLogRepository.delete({
      createdAt: () => `createdAt < '${thirtyDaysAgo.toISOString()}'`,
    } as any);

    this.logger.log(
      `Cleaned up ${result.affected || 0} old webhook logs`,
    );
  }
}
