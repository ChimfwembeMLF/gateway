import { Injectable, Logger } from '@nestjs/common';
import { Invoice } from '../../billing/entities';

/**
 * EmailService
 * Handles email notifications for billing events
 * Note: Integrate with actual email provider (SendGrid, Mailgun, AWS SES, etc.)
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  /**
   * Send invoice notification email
   */
  async sendInvoiceNotification(
    toEmail: string,
    tenantName: string,
    invoice: Invoice,
  ): Promise<void> {
    try {
      this.logger.log(`Sending invoice notification to ${toEmail} for invoice ${invoice.invoiceNumber}`);

      // TODO: Integrate with actual email provider
      // Example template:
      const emailContent = this.generateInvoiceEmailContent(tenantName, invoice);

      // Example implementation (replace with actual email provider):
      // await this.emailProvider.send({
      //   to: toEmail,
      //   subject: `Invoice ${invoice.invoiceNumber} from Payment Gateway`,
      //   html: emailContent,
      // });

      this.logger.log(`Invoice notification sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Error sending invoice notification: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send invoice reminder email
   */
  async sendInvoiceReminder(
    toEmail: string,
    tenantName: string,
    invoice: Invoice,
  ): Promise<void> {
    try {
      this.logger.log(`Sending invoice reminder to ${toEmail} for invoice ${invoice.invoiceNumber}`);

      const emailContent = this.generateReminderEmailContent(tenantName, invoice);

      // TODO: Integrate with actual email provider
      // await this.emailProvider.send({
      //   to: toEmail,
      //   subject: `Payment Reminder: Invoice ${invoice.invoiceNumber} Due Soon`,
      //   html: emailContent,
      // });

      this.logger.log(`Invoice reminder sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Error sending invoice reminder: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Send overdue invoice notification
   */
  async sendOverdueNotification(
    toEmail: string,
    tenantName: string,
    invoice: Invoice,
  ): Promise<void> {
    try {
      this.logger.log(`Sending overdue notification to ${toEmail} for invoice ${invoice.invoiceNumber}`);

      const emailContent = this.generateOverdueEmailContent(tenantName, invoice);

      // TODO: Integrate with actual email provider
      // await this.emailProvider.send({
      //   to: toEmail,
      //   subject: `URGENT: Invoice ${invoice.invoiceNumber} is Overdue`,
      //   html: emailContent,
      // });

      this.logger.log(`Overdue notification sent to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Error sending overdue notification: ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Generate invoice notification email content
   */
  private generateInvoiceEmailContent(tenantName: string, invoice: Invoice): string {
    const formatCurrency = (amount: number) => `$${Number(amount).toFixed(2)}`;
    const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f8f9fa; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #007bff; }
        .invoice-details { background-color: #fff; border: 1px solid #ddd; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: bold; }
        .amount { text-align: right; }
        .total-row { display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #333; font-weight: bold; font-size: 18px; }
        .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Invoice</h1>
        </div>

        <p>Hello ${tenantName},</p>
        <p>Your invoice is ready. Please find the details below:</p>

        <div class="invoice-details">
            <div class="detail-row">
                <span class="label">Invoice #:</span>
                <span>${invoice.invoiceNumber}</span>
            </div>
            <div class="detail-row">
                <span class="label">Issue Date:</span>
                <span>${formatDate(invoice.issueDate)}</span>
            </div>
            <div class="detail-row">
                <span class="label">Due Date:</span>
                <span>${formatDate(invoice.dueDate)}</span>
            </div>
            <div class="detail-row">
                <span class="label">Billing Period:</span>
                <span>${formatDate(invoice.billingPeriodStart)} - ${formatDate(invoice.billingPeriodEnd)}</span>
            </div>
            <div class="detail-row">
                <span class="label">Subtotal:</span>
                <span class="amount">${formatCurrency(Number(invoice.subtotal))}</span>
            </div>
            ${
              Number(invoice.discountAmount) > 0
                ? `
            <div class="detail-row">
                <span class="label">Discount:</span>
                <span class="amount">-${formatCurrency(Number(invoice.discountAmount))}</span>
            </div>
            `
                : ''
            }
            <div class="detail-row">
                <span class="label">Tax (${Number(invoice.taxRate)}%):</span>
                <span class="amount">${formatCurrency(Number(invoice.taxAmount))}</span>
            </div>
            <div class="total-row">
                <span>Total Due:</span>
                <span>${formatCurrency(Number(invoice.totalAmount))}</span>
            </div>
        </div>

        <p>Please make payment by ${formatDate(invoice.dueDate)} to avoid late fees.</p>

        <a href="https://dashboard.yourdomain.com/invoices/${invoice.id}" class="cta-button">View Invoice</a>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>Payment Gateway Team</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate invoice reminder email content
   */
  private generateReminderEmailContent(tenantName: string, invoice: Invoice): string {
    const formatCurrency = (amount: number) => `$${Number(amount).toFixed(2)}`;
    const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US');
    const daysUntilDue = Math.ceil(
      (new Date(invoice.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .alert h2 { margin-top: 0; color: #856404; }
        .invoice-summary { background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .cta-button { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="alert">
            <h2>Payment Reminder</h2>
            <p>Invoice ${invoice.invoiceNumber} is due in <strong>${daysUntilDue} days</strong>.</p>
        </div>

        <p>Hello ${tenantName},</p>
        <p>This is a friendly reminder that your invoice is due soon.</p>

        <div class="invoice-summary">
            <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Amount Due:</strong> ${formatCurrency(Number(invoice.totalAmount))}</p>
            <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
        </div>

        <p>Please make payment at your earliest convenience to avoid late fees.</p>

        <a href="https://dashboard.yourdomain.com/invoices/${invoice.id}" class="cta-button">Pay Now</a>

        <div class="footer">
            <p>Thank you for your business!</p>
            <p>Payment Gateway Team</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Generate overdue invoice email content
   */
  private generateOverdueEmailContent(tenantName: string, invoice: Invoice): string {
    const formatCurrency = (amount: number) => `$${Number(amount).toFixed(2)}`;
    const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US');
    const daysOverdue = Math.ceil(
      (new Date().getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24),
    );

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 4px; margin-bottom: 20px; color: #721c24; }
        .alert h2 { margin-top: 0; }
        .invoice-summary { background-color: #fff; border: 2px solid #dc3545; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .cta-button { display: inline-block; background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        .footer { margin-top: 40px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="alert">
            <h2>⚠️ URGENT: Invoice Overdue</h2>
            <p>Invoice ${invoice.invoiceNumber} is <strong>${daysOverdue} days overdue</strong>.</p>
        </div>

        <p>Hello ${tenantName},</p>
        <p>Your payment is now overdue. Immediate action is required.</p>

        <div class="invoice-summary">
            <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Amount Due:</strong> ${formatCurrency(Number(invoice.totalAmount))}</p>
            <p><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</p>
            <p><strong>Days Overdue:</strong> ${daysOverdue}</p>
        </div>

        <p>Please settle this invoice immediately to avoid service suspension and additional fees.</p>

        <a href="https://dashboard.yourdomain.com/invoices/${invoice.id}" class="cta-button">Pay Now</a>

        <p>If you have already made payment, please disregard this notice.</p>

        <div class="footer">
            <p>Payment Gateway Team</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}
