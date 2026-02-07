import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  LineItemType,
  TenantBillingSubscription,
  UsageMetrics,
  BillingPlan,
} from '../entities';
import {
  GenerateInvoiceDto,
  InvoiceResponseDto,
  UpdateInvoiceDto,
  InvoiceQueryDto,
} from '../dto';

/**
 * InvoiceService
 * Handles invoice generation, calculation, and management
 */
@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceLineItem)
    private readonly lineItemRepository: Repository<InvoiceLineItem>,
    @InjectRepository(TenantBillingSubscription)
    private readonly subscriptionRepository: Repository<TenantBillingSubscription>,
    @InjectRepository(UsageMetrics)
    private readonly usageMetricsRepository: Repository<UsageMetrics>,
    @InjectRepository(BillingPlan)
    private readonly billingPlanRepository: Repository<BillingPlan>,
  ) {}

  /**
   * Generate an invoice for a tenant for a specific billing period
   */
  async generateInvoice(dto: GenerateInvoiceDto): Promise<Invoice> {
    this.logger.log(`Generating invoice for tenant ${dto.tenantId}`);

    const { tenantId, billingPeriodStart, billingPeriodEnd, taxRate = 0, discountAmount = 0 } = dto;

    // Get active subscription
    const subscription = await this.subscriptionRepository.findOne({
      where: { tenantId, isActive: true },
      relations: ['billingPlan'],
    });

    if (!subscription) {
      throw new NotFoundException(`No active subscription found for tenant ${tenantId}`);
    }

    // Check if invoice already exists for this period
    const existingInvoice = await this.invoiceRepository.findOne({
      where: {
        tenantId,
        billingPeriodStart: new Date(billingPeriodStart),
        billingPeriodEnd: new Date(billingPeriodEnd),
      },
    });

    if (existingInvoice) {
      this.logger.warn(`Invoice already exists for tenant ${tenantId} for this period`);
      return existingInvoice;
    }

    // Create invoice
    const invoice = this.invoiceRepository.create({
      invoiceNumber: await this.generateInvoiceNumber(),
      tenantId,
      subscriptionId: subscription.id,
      billingPeriodStart: new Date(billingPeriodStart),
      billingPeriodEnd: new Date(billingPeriodEnd),
      issueDate: new Date(),
      dueDate: this.calculateDueDate(),
      taxRate,
      discountAmount,
      currency: 'USD',
      status: InvoiceStatus.PENDING,
    });

    const savedInvoice = await this.invoiceRepository.save(invoice);

    // Generate line items
    const lineItems = await this.generateLineItems(
      savedInvoice.id,
      subscription,
      billingPeriodStart,
      billingPeriodEnd,
    );

    await this.lineItemRepository.save(lineItems);

    // Calculate totals
    await this.calculateInvoiceTotals(savedInvoice.id);

    // Reload invoice with line items
    const reloadedInvoice = await this.invoiceRepository.findOne({
      where: { id: savedInvoice.id },
      relations: ['lineItems'],
    });

    if (!reloadedInvoice) {
      throw new Error(`Failed to reload invoice ${savedInvoice.id}`);
    }

    return reloadedInvoice;
  }

  /**
   * Generate line items for an invoice
   */
  private async generateLineItems(
    invoiceId: string,
    subscription: TenantBillingSubscription,
    billingPeriodStart: string,
    billingPeriodEnd: string,
  ): Promise<InvoiceLineItem[]> {
    const lineItems: InvoiceLineItem[] = [];
    const plan = subscription.billingPlan;

    // Add subscription line item
    const subscriptionPrice =
      subscription.billingFrequency === 'ANNUAL' ? plan.yearlyPrice : plan.monthlyPrice;

    lineItems.push(
      this.lineItemRepository.create({
        invoiceId,
        type: LineItemType.SUBSCRIPTION,
        description: `${plan.name} Plan - ${subscription.billingFrequency}`,
        quantity: 1,
        unitPrice: subscriptionPrice,
        amount: subscriptionPrice,
        metadata: {
          planType: plan.type,
          billingFrequency: subscription.billingFrequency,
        },
      }),
    );

    // Get usage metrics for the period
    const usageMetrics = await this.usageMetricsRepository.find({
      where: {
        tenantId: subscription.tenantId,
      },
    });

    const filteredMetrics = usageMetrics.filter(
      (metric) =>
        new Date(metric.date) >= new Date(billingPeriodStart) &&
        new Date(metric.date) <= new Date(billingPeriodEnd),
    );

    if (filteredMetrics.length > 0) {
      const totalRequests = filteredMetrics.reduce((sum, metric) => sum + metric.totalRequests, 0);
      const allowedRequests = this.getAllowedRequests(plan, subscription.billingFrequency);
      const overageRequests = Math.max(0, totalRequests - allowedRequests);

      // Add usage summary line item
      lineItems.push(
        this.lineItemRepository.create({
          invoiceId,
          type: LineItemType.USAGE,
          description: `API Requests (${totalRequests.toLocaleString()} requests)`,
          quantity: totalRequests,
          unitPrice: 0,
          amount: 0,
          metadata: {
            allowedRequests,
            totalRequests,
            overageRequests,
          },
        }),
      );

      // Add overage charges if applicable
      if (overageRequests > 0) {
        const overageRate = this.getOverageRate(plan);
        const overageAmount = (overageRequests / 1000) * overageRate;

        lineItems.push(
          this.lineItemRepository.create({
            invoiceId,
            type: LineItemType.OVERAGE,
            description: `Overage Charges (${overageRequests.toLocaleString()} requests @ $${overageRate}/1000)`,
            quantity: overageRequests / 1000,
            unitPrice: overageRate,
            amount: overageAmount,
            metadata: {
              overageRequests,
              overageRate,
            },
          }),
        );
      }
    }

    return lineItems;
  }

  /**
   * Calculate allowed requests based on plan and billing frequency
   */
  private getAllowedRequests(plan: BillingPlan, billingFrequency: 'MONTHLY' | 'ANNUAL'): number {
    const daysInPeriod = billingFrequency === 'ANNUAL' ? 365 : 30;
    return plan.maxDailyRequests * daysInPeriod;
  }

  /**
   * Get overage rate per 1000 requests
   */
  private getOverageRate(plan: BillingPlan): number {
    // Define overage rates per plan type (per 1000 requests)
    const overageRates = {
      FREE: 0.5,
      STANDARD: 0.3,
      PREMIUM: 0.2,
      ENTERPRISE: 0.1,
    };

    return overageRates[plan.type] || 0.5;
  }

  /**
   * Calculate invoice totals
   */
  private async calculateInvoiceTotals(invoiceId: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id: invoiceId },
      relations: ['lineItems'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    // Calculate subtotal (exclude USAGE type which is informational only)
    const subtotal = invoice.lineItems
      .filter((item) => item.type !== LineItemType.USAGE)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const taxAmount = (subtotal * Number(invoice.taxRate)) / 100;
    const totalAmount = subtotal + taxAmount - Number(invoice.discountAmount);

    // Update invoice
    invoice.subtotal = subtotal;
    invoice.taxAmount = taxAmount;
    invoice.totalAmount = Math.max(0, totalAmount);

    await this.invoiceRepository.save(invoice);
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Get count of invoices this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

    const count = await this.invoiceRepository.count({
      where: {
        createdAt: Between(startOfMonth, endOfMonth),
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${sequence}`;
  }

  /**
   * Calculate due date (30 days from issue date)
   */
  private calculateDueDate(): Date {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate;
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string): Promise<Invoice> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['lineItems', 'tenant'],
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  /**
   * Get invoices with filters
   */
  async getInvoices(query: InvoiceQueryDto): Promise<Invoice[]> {
    const where: any = {};

    if (query.tenantId) {
      where.tenantId = query.tenantId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate && query.endDate) {
      where.createdAt = Between(new Date(query.startDate), new Date(query.endDate));
    }

    return this.invoiceRepository.find({
      where,
      relations: ['lineItems'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update invoice
   */
  async updateInvoice(id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id);

    Object.assign(invoice, dto);

    // If marking as paid, set paidAt
    if (dto.status === InvoiceStatus.PAID && !invoice.paidAt) {
      invoice.paidAt = new Date();
      invoice.amountPaid = invoice.totalAmount;
    }

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(
    id: string,
    paymentMethod: string,
    paymentTransactionId: string,
  ): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id);

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    invoice.amountPaid = invoice.totalAmount;
    invoice.paymentMethod = paymentMethod;
    invoice.paymentTransactionId = paymentTransactionId;

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(id: string, reason: string): Promise<Invoice> {
    const invoice = await this.getInvoiceById(id);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot cancel a paid invoice');
    }

    invoice.status = InvoiceStatus.CANCELLED;
    invoice.notes = reason;

    return this.invoiceRepository.save(invoice);
  }

  /**
   * Map entity to response DTO
   */
  mapToResponseDto(invoice: Invoice): InvoiceResponseDto {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      tenantId: invoice.tenantId,
      subscriptionId: invoice.subscriptionId,
      billingPeriodStart: invoice.billingPeriodStart,
      billingPeriodEnd: invoice.billingPeriodEnd,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: Number(invoice.subtotal),
      taxAmount: Number(invoice.taxAmount),
      taxRate: Number(invoice.taxRate),
      discountAmount: Number(invoice.discountAmount),
      totalAmount: Number(invoice.totalAmount),
      amountPaid: Number(invoice.amountPaid),
      currency: invoice.currency,
      status: invoice.status,
      paidAt: invoice.paidAt,
      paymentMethod: invoice.paymentMethod,
      paymentTransactionId: invoice.paymentTransactionId,
      notes: invoice.notes,
      pdfUrl: invoice.pdfUrl,
      emailSent: invoice.emailSent,
      emailSentAt: invoice.emailSentAt,
      lineItems: invoice.lineItems?.map((item) => ({
        id: item.id,
        type: item.type,
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
        metadata: item.metadata,
      })),
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }
}
