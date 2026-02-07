import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceLineItem } from '../entities';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PdfGeneratorService
 * Generates PDF invoices
 * Note: This is a basic implementation. For production, consider using libraries like:
 * - pdfkit
 * - puppeteer
 * - pdf-lib
 */
@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private readonly outputDir = path.join(process.cwd(), 'invoices');

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate PDF for an invoice
   */
  async generatePdf(invoiceId: string): Promise<string> {
    this.logger.log(`Generating PDF for invoice ${invoiceId}`);

    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['lineItems', 'tenant'],
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Generate HTML content
    const html = this.generateHtml(invoice);

    // For now, save as HTML file
    // In production, convert this HTML to PDF using puppeteer or similar
    const filename = `${invoice.invoiceNumber}.html`;
    const filepath = path.join(this.outputDir, filename);

    fs.writeFileSync(filepath, html);

    // Update invoice with PDF URL
    invoice.pdfUrl = `/invoices/${filename}`;
    await this.invoiceRepository.save(invoice);

    this.logger.log(`PDF generated: ${filepath}`);
    return invoice.pdfUrl;
  }

  /**
   * Generate HTML content for invoice
   */
  private generateHtml(invoice: Invoice): string {
    const formatCurrency = (amount: number) => `$${Number(amount).toFixed(2)}`;
    const formatDate = (date: Date) => new Date(date).toLocaleDateString('en-US');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Invoice ${invoice.invoiceNumber}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
        }
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        .company-info {
            font-size: 14px;
        }
        .invoice-info {
            text-align: right;
        }
        .invoice-title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .invoice-number {
            font-size: 18px;
            color: #666;
        }
        .billing-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
        }
        .billing-section {
            width: 45%;
        }
        .billing-section h3 {
            margin-bottom: 10px;
            font-size: 14px;
            text-transform: uppercase;
            color: #666;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        th {
            background-color: #f5f5f5;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #ddd;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #eee;
        }
        .text-right {
            text-align: right;
        }
        .totals {
            margin-left: auto;
            width: 300px;
        }
        .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .totals-row.total {
            font-weight: bold;
            font-size: 18px;
            border-bottom: 2px solid #333;
        }
        .status {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
        }
        .status.paid {
            background-color: #d4edda;
            color: #155724;
        }
        .status.pending {
            background-color: #fff3cd;
            color: #856404;
        }
        .status.overdue {
            background-color: #f8d7da;
            color: #721c24;
        }
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h1>Payment Gateway</h1>
            <p>Your Company Name<br>
            123 Main Street<br>
            City, State 12345<br>
            Phone: (555) 123-4567</p>
        </div>
        <div class="invoice-info">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">${invoice.invoiceNumber}</div>
            <p>
                <strong>Issue Date:</strong> ${formatDate(invoice.issueDate)}<br>
                <strong>Due Date:</strong> ${formatDate(invoice.dueDate)}<br>
                <strong>Status:</strong> <span class="status ${invoice.status.toLowerCase()}">${invoice.status}</span>
            </p>
        </div>
    </div>

    <div class="billing-info">
        <div class="billing-section">
            <h3>Bill To</h3>
            <p>
                <strong>Tenant ID:</strong> ${invoice.tenantId}<br>
                ${invoice.tenant ? `<strong>Company:</strong> ${invoice.tenant.name || 'N/A'}<br>` : ''}
            </p>
        </div>
        <div class="billing-section">
            <h3>Billing Period</h3>
            <p>
                <strong>From:</strong> ${formatDate(invoice.billingPeriodStart)}<br>
                <strong>To:</strong> ${formatDate(invoice.billingPeriodEnd)}
            </p>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Description</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.lineItems
              .map(
                (item: InvoiceLineItem) => `
            <tr>
                <td>${item.description}</td>
                <td class="text-right">${Number(item.quantity).toLocaleString()}</td>
                <td class="text-right">${formatCurrency(Number(item.unitPrice))}</td>
                <td class="text-right">${formatCurrency(Number(item.amount))}</td>
            </tr>
            `,
              )
              .join('')}
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(Number(invoice.subtotal))}</span>
        </div>
        ${
          Number(invoice.discountAmount) > 0
            ? `
        <div class="totals-row">
            <span>Discount:</span>
            <span>-${formatCurrency(Number(invoice.discountAmount))}</span>
        </div>
        `
            : ''
        }
        <div class="totals-row">
            <span>Tax (${Number(invoice.taxRate)}%):</span>
            <span>${formatCurrency(Number(invoice.taxAmount))}</span>
        </div>
        <div class="totals-row total">
            <span>Total:</span>
            <span>${formatCurrency(Number(invoice.totalAmount))}</span>
        </div>
        ${
          invoice.status === 'PAID'
            ? `
        <div class="totals-row">
            <span>Amount Paid:</span>
            <span>${formatCurrency(Number(invoice.amountPaid))}</span>
        </div>
        `
            : ''
        }
    </div>

    ${
      invoice.notes
        ? `
    <div style="margin-top: 40px;">
        <h3>Notes</h3>
        <p>${invoice.notes}</p>
    </div>
    `
        : ''
    }

    <div class="footer">
        <p>
            Thank you for your business!<br>
            For questions about this invoice, please contact support@yourcompany.com
        </p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Get PDF path for an invoice
   */
  getPdfPath(invoiceNumber: string): string {
    return path.join(this.outputDir, `${invoiceNumber}.html`);
  }
}
