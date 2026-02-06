import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions, BatchEmailOptions } from '../interfaces/email-provider.interface';

/**
 * Console Email Provider
 * For development - logs emails to console
 */
@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Send a single email (logs to console)
   */
  async send(options: EmailOptions): Promise<void> {
    const isDevelopment = this.configService.get<string>('NODE_ENV') === 'development';

    this.logger.log(`[CONSOLE] Email notification:`);
    console.log({
      to: options.to,
      subject: options.subject,
      from: options.from,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
      htmlPreview: options.html.substring(0, 200) + '...',
    });

    if (isDevelopment) {
      console.log(`\n========== EMAIL CONTENT ==========`);
      console.log(options.html);
      console.log(`==================================\n`);
    }
  }

  /**
   * Send multiple emails in batch
   */
  async sendBatch(options: BatchEmailOptions): Promise<void> {
    const concurrency = options.concurrency || 5;
    const { emails } = options;

    try {
      for (let i = 0; i < emails.length; i += concurrency) {
        const batch = emails.slice(i, i + concurrency);
        await Promise.all(batch.map((email) => this.send(email)));
      }
      this.logger.log(`[CONSOLE] Batch email: ${emails.length} emails logged`);
    } catch (error) {
      this.logger.error(`Error in batch email logging: ${error.message}`, error);
      throw error;
    }
  }
}
