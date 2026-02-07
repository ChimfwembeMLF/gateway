/**
 * Email Provider Interface
 * Defines the contract for email providers
 */
export interface EmailProvider {
  send(options: EmailOptions): Promise<void>;
  sendBatch(options: BatchEmailOptions): Promise<void>;
}

/**
 * Email sending options
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
}

/**
 * Batch email options for sending multiple emails
 */
export interface BatchEmailOptions {
  emails: EmailOptions[];
  concurrency?: number;
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

/**
 * Email provider configuration
 */
export interface EmailProviderConfig {
  apiKey?: string;
  domain?: string;
  fromEmail?: string;
  fromName?: string;
  region?: string;
  provider: 'sendgrid' | 'nodemailer' | 'mock' | 'console';
}
