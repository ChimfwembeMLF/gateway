import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WebhookNotificationService {
  private readonly logger = new Logger(WebhookNotificationService.name);

  async notifyWebhook(
    webhookUrl: string,
    eventType: string,
    payload: Record<string, any>,
    secret?: string,
  ): Promise<void> {
    if (!webhookUrl) {
      this.logger.warn('No webhook URL provided, skipping notification.');
      return;
    }
    try {
      // Optionally sign payload with secret here
      const body = {
        event: eventType,
        data: payload,
      };
      await axios.post(webhookUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'X-Webhook-Signature': secret } : {}),
        },
        timeout: 10000,
      });
      this.logger.log(`Webhook sent to ${webhookUrl} for event ${eventType}`);
    } catch (error) {
      this.logger.error(`Failed to send webhook to ${webhookUrl}: ${error.message}`);
    }
  }
}
