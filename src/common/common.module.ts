import { Module } from '@nestjs/common';
import { WebhookNotificationService } from './webhook-notification.service';

@Module({
  providers: [WebhookNotificationService],
  exports: [WebhookNotificationService],
})
export class CommonModule {}
