import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProvider, EmailOptions, BatchEmailOptions } from '../interfaces/email-provider.interface';
import * as nodemailer from 'nodemailer';

/**
 * Nodemailer Email Provider
 * Sends emails using Nodemailer (supports SMTP, Sendmail, and custom transports)
 */
@Injectable()
export class NodemailerProvider implements EmailProvider {
  private readonly logger = new Logger(NodemailerProvider.name);
  private readonly transporter: any;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const host = configService.get<string>('email.nodemailer.host');
    const port = configService.get<number>('email.nodemailer.port');
    const secure = configService.get<boolean>('email.nodemailer.secure', true);
    const user = configService.get<string>('email.nodemailer.user');
    const pass = configService.get<string>('email.nodemailer.pass');
    const fromEmail = configService.get<string>('email.nodemailer.fromEmail');
    const fromName = configService.get<string>('email.nodemailer.fromName', 'Payment Gateway');

    if (!host || !port || !fromEmail) {
      this.isEnabled = false;
      this.transporter = null;
      this.fromEmail = fromEmail || '';
      this.fromName = fromName;
      this.logger.warn(
        'Nodemailer is disabled. Configure NODEMAILER_HOST, NODEMAILER_PORT, and NODEMAILER_FROM_EMAIL to enable email sending.',
      );
      return;
    }

    // Configure SMTP transporter
    const config: any = {
      host,
      port,
      secure, // true for 465, false for other ports
    };

    // Add authentication if credentials provided
    if (user && pass) {
      config.auth = {
        user,
        pass,
      };
    }

    this.transporter = nodemailer.createTransport(config);
    this.fromEmail = fromEmail;
    this.fromName = fromName;
    this.isEnabled = true;

    this.logger.log(`Nodemailer configured for ${host}:${port}`);
  }

  /**
   * Send a single email via Nodemailer
   */
  async send(options: EmailOptions): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('Email send skipped because Nodemailer is not configured.');
      return;
    }
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
      };

      const cleanedOptions = Object.fromEntries(
        Object.entries(mailOptions).filter(([, value]) => value !== undefined),
      ) as nodemailer.SendMailOptions;

      const result = await this.transporter.sendMail(cleanedOptions);
      this.logger.log(
        `Email sent successfully to ${Array.isArray(options.to) ? options.to.join(', ') : options.to} (Message ID: ${result.messageId})`,
      );
    } catch (error) {
      this.logger.error(`Error sending email via Nodemailer: ${error.message}`, error);
      throw error;
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
      this.logger.log(`Batch email sent: ${emails.length} emails processed`);
    } catch (error) {
      this.logger.error(`Error sending batch emails via Nodemailer: ${error.message}`, error);
      throw error;
    }
  }
}
