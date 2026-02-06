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

  constructor(private readonly configService: ConfigService) {
    const host = configService.get<string>('email.nodemailer.host');
    const port = configService.get<number>('email.nodemailer.port');
    const secure = configService.get<boolean>('email.nodemailer.secure', true);
    const user = configService.get<string>('email.nodemailer.user');
    const pass = configService.get<string>('email.nodemailer.pass');
    const fromEmail = configService.get<string>('email.nodemailer.fromEmail');
    const fromName = configService.get<string>('email.nodemailer.fromName', 'Payment Gateway');

    if (!host) {
      throw new Error('NODEMAILER_HOST environment variable is required');
    }
    if (!port) {
      throw new Error('NODEMAILER_PORT environment variable is required');
    }
    if (!fromEmail) {
      throw new Error('NODEMAILER_FROM_EMAIL environment variable is required');
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

    this.logger.log(`Nodemailer configured for ${host}:${port}`);
  }

  /**
   * Send a single email via Nodemailer
   */
  async send(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
      };

      // Remove undefined values
      Object.keys(mailOptions).forEach(
        (key) => mailOptions[key] === undefined && delete mailOptions[key],
      );

      const result = await this.transporter.sendMail(mailOptions);
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
