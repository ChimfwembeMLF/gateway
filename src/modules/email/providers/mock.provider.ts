import { Injectable, Logger } from '@nestjs/common';
import { EmailProvider, EmailOptions, BatchEmailOptions } from '../interfaces/email-provider.interface';

/**
 * Mock Email Provider
 * For testing and development - logs emails instead of sending
 */
@Injectable()
export class MockEmailProvider implements EmailProvider {
  private readonly logger = new Logger(MockEmailProvider.name);
  private sentEmails: EmailOptions[] = [];

  /**
   * Send a single email (logs to console in mock)
   */
  async send(options: EmailOptions): Promise<void> {
    this.sentEmails.push(options);
    this.logger.log(`[MOCK] Email sent to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    this.logger.log(`[MOCK] Subject: ${options.subject}`);
    console.log(`\n[MOCK EMAIL]\nTo: ${options.to}\nSubject: ${options.subject}\n`);
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
      this.logger.log(`[MOCK] Batch email sent: ${emails.length} emails processed`);
    } catch (error) {
      this.logger.error(`Error sending batch emails via Mock: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Get all sent emails (for testing)
   */
  getSentEmails(): EmailOptions[] {
    return [...this.sentEmails];
  }

  /**
   * Clear sent emails log (for testing)
   */
  clearSentEmails(): void {
    this.sentEmails = [];
  }

  /**
   * Get sent emails count (for testing)
   */
  getSentEmailsCount(): number {
    return this.sentEmails.length;
  }
}
