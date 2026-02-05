import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { BillingLimitService, UsageMetricsService, InvoiceService, PdfGeneratorService, UsageStats, DailyUsage } from './services';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CancelSubscriptionDto,
  BillingPlanResponseDto,
  SubscriptionResponseDto,
  GenerateInvoiceDto,
  InvoiceResponseDto,
  UpdateInvoiceDto,
  InvoiceQueryDto,
} from './dto';
import { BillingPlanType } from './entities';
import { AdminGuard } from 'src/common/guards/admin.guard';

/**
 * BillingController
 * Manages billing plans, tenant subscriptions, and usage analytics
 */
@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly billingLimitService: BillingLimitService,
    private readonly usageMetricsService: UsageMetricsService,
    private readonly invoiceService: InvoiceService,
    private readonly pdfGeneratorService: PdfGeneratorService,
  ) {}

  /**
   * Get all active billing plans
   * Public endpoint - anyone can view available plans
   */
  @Get('plans')
  async getPlans(): Promise<BillingPlanResponseDto[]> {
    this.logger.log('Fetching all active billing plans');
    const plans = await this.billingLimitService.getActivePlans();
    return plans.map((plan) => this.mapPlanToResponse(plan));
  }

  /**
   * Get specific billing plan by type
   * Public endpoint
   */
  @Get('plans/:type')
  async getPlanByType(
    @Param('type') type: string,
  ): Promise<BillingPlanResponseDto> {
    this.logger.log(`Fetching billing plan: ${type}`);

    if (!Object.values(BillingPlanType).includes(type as BillingPlanType)) {
      throw new HttpException(
        `Invalid plan type. Must be one of: ${Object.values(BillingPlanType).join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const plans = await this.billingLimitService.getActivePlans();
    const plan = plans.find((p) => p.type === type);

    if (!plan) {
      throw new HttpException('Plan not found', HttpStatus.NOT_FOUND);
    }

    return this.mapPlanToResponse(plan);
  }

  /**
   * Create a new subscription for a tenant
   * Admin only
   */
  @Post('subscriptions')
  @UseGuards(AdminGuard)
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(
      `Creating subscription for tenant ${dto.tenantId} with plan ${dto.planType}`,
    );

    try {
      const subscription = await this.billingLimitService.subscribeTenantToPlan(
        dto.tenantId,
        dto.planType,
        dto.billingFrequency,
        dto.autoRenew ?? true,
      );

      // Update amount paid if provided
      if (dto.amountPaid !== undefined) {
        subscription.amountPaid = dto.amountPaid;
        await this.billingLimitService['subscriptionRepository'].save(
          subscription,
        );
      }

      return this.mapSubscriptionToResponse(subscription);
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to create subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get tenant's current subscription
   * Admin only
   */
  @Get('subscriptions/tenant/:tenantId')
  @UseGuards(AdminGuard)
  async getTenantSubscription(
    @Param('tenantId') tenantId: string,
  ): Promise<SubscriptionResponseDto | null> {
    this.logger.log(`Fetching subscription for tenant ${tenantId}`);

    const subscription = await this.billingLimitService.getTenantSubscription(
      tenantId,
    );

    if (!subscription) {
      return null;
    }

    return this.mapSubscriptionToResponse(subscription);
  }

  /**
   * Get subscription by ID
   * Admin only
   */
  @Get('subscriptions/:id')
  @UseGuards(AdminGuard)
  async getSubscriptionById(
    @Param('id') id: string,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Fetching subscription ${id}`);

    const subscription = await this.billingLimitService[
      'subscriptionRepository'
    ].findOne({
      where: { id },
      relations: ['billingPlan'],
    });

    if (!subscription) {
      throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
    }

    return this.mapSubscriptionToResponse(subscription);
  }

  /**
   * Update subscription
   * Admin only - allows changing plan or billing frequency
   */
  @Put('subscriptions/:id')
  @UseGuards(AdminGuard)
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Updating subscription ${id}`);

    const subscription = await this.billingLimitService[
      'subscriptionRepository'
    ].findOne({
      where: { id },
      relations: ['billingPlan'],
    });

    if (!subscription) {
      throw new HttpException('Subscription not found', HttpStatus.NOT_FOUND);
    }

    // If changing plan type, create new subscription
    if (dto.planType && dto.planType !== subscription.billingPlan.type) {
      this.logger.log(
        `Changing plan from ${subscription.billingPlan.type} to ${dto.planType}`,
      );

      const newSubscription = await this.billingLimitService.subscribeTenantToPlan(
        subscription.tenantId,
        dto.planType,
        dto.billingFrequency || subscription.billingFrequency,
        dto.autoRenew ?? subscription.autoRenew,
      );

      if (dto.amountPaid !== undefined) {
        newSubscription.amountPaid = dto.amountPaid;
        await this.billingLimitService['subscriptionRepository'].save(
          newSubscription,
        );
      }

      return this.mapSubscriptionToResponse(newSubscription);
    }

    // Update existing subscription properties
    if (dto.billingFrequency) {
      subscription.billingFrequency = dto.billingFrequency;
    }
    if (dto.autoRenew !== undefined) {
      subscription.autoRenew = dto.autoRenew;
    }
    if (dto.amountPaid !== undefined) {
      subscription.amountPaid = dto.amountPaid;
    }

    const updated = await this.billingLimitService[
      'subscriptionRepository'
    ].save(subscription);
    return this.mapSubscriptionToResponse(updated);
  }

  /**
   * Cancel subscription
   * Admin only
   */
  @Delete('subscriptions/:id')
  @UseGuards(AdminGuard)
  async cancelSubscription(
    @Param('id') id: string,
    @Body() dto: CancelSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    this.logger.log(`Cancelling subscription ${id}`);

    try {
      const subscription = await this.billingLimitService.cancelSubscription(
        id,
        dto.reason,
      );
      return this.mapSubscriptionToResponse(subscription);
    } catch (error) {
      this.logger.error(`Failed to cancel subscription: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to cancel subscription',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Map BillingPlan entity to response DTO
   */
  private mapPlanToResponse(plan: any): BillingPlanResponseDto {
    return {
      id: plan.id,
      type: plan.type,
      name: plan.name,
      description: plan.description,
      monthlyPrice: parseFloat(plan.monthlyPrice),
      yearlyPrice: parseFloat(plan.yearlyPrice),
      requestsPerMinute: plan.requestsPerMinute,
      maxDailyRequests: plan.maxDailyRequests,
      maxConcurrentRequests: plan.maxConcurrentRequests,
      features: plan.features,
      supportTier: plan.supportTier,
      slaUptime: parseFloat(plan.slaUptime),
      isActive: plan.isActive,
      priority: plan.priority,
    };
  }

  /**
   * Map TenantBillingSubscription entity to response DTO
   */
  private mapSubscriptionToResponse(subscription: any): SubscriptionResponseDto {
    return {
      id: subscription.id,
      tenantId: subscription.tenantId,
      billingPlan: this.mapPlanToResponse(subscription.billingPlan),
      startDate: subscription.startDate,
      expiresAt: subscription.expiresAt,
      billingFrequency: subscription.billingFrequency,
      autoRenew: subscription.autoRenew,
      amountPaid: subscription.amountPaid
        ? parseFloat(subscription.amountPaid)
        : null,
      isActive: subscription.isActive,
      cancellationReason: subscription.cancellationReason,
      cancelledAt: subscription.cancelledAt,
      notes: subscription.notes,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  /**
   * Get usage analytics for a tenant
   * Admin only
   * Query params: startDate, endDate (YYYY-MM-DD format)
   */
  @Get('usage/tenant/:tenantId')
  @UseGuards(AdminGuard)
  async getTenantUsageAnalytics(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<UsageStats> {
    this.logger.log(`Fetching usage analytics for tenant ${tenantId}`);

    // Default to current month if no dates provided
    if (!startDate || !endDate) {
      return this.usageMetricsService.getCurrentMonthUsage(tenantId);
    }

    return this.usageMetricsService.getTenantUsage(
      tenantId,
      startDate,
      endDate,
    );
  }

  /**
   * Get daily usage breakdown for a tenant
   * Admin only
   */
  @Get('usage/tenant/:tenantId/daily')
  @UseGuards(AdminGuard)
  async getTenantDailyUsage(
    @Param('tenantId') tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<DailyUsage[]> {
    this.logger.log(`Fetching daily usage for tenant ${tenantId}`);

    // Default to last 30 days
    if (!startDate || !endDate) {
      const now = new Date();
      endDate = now.toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
    }

    return this.usageMetricsService.getDailyUsage(tenantId, startDate, endDate);
  }

  /**
   * Get current month usage for a tenant
   * Admin only
   */
  @Get('usage/tenant/:tenantId/current-month')
  @UseGuards(AdminGuard)
  async getTenantCurrentMonthUsage(
    @Param('tenantId') tenantId: string,
  ): Promise<UsageStats> {
    this.logger.log(`Fetching current month usage for tenant ${tenantId}`);
    return this.usageMetricsService.getCurrentMonthUsage(tenantId);
  }

  /**
   * Get usage summary for all tenants
   * Admin only - useful for platform-wide analytics
   */
  @Get('usage/all')
  @UseGuards(AdminGuard)
  async getAllTenantsUsage(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<Array<{ tenantId: string; usage: UsageStats }>> {
    this.logger.log('Fetching usage for all tenants');

    // Default to current month
    if (!startDate || !endDate) {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      endDate = now.toISOString().split('T')[0];
    }

    return this.usageMetricsService.getAllTenantsUsage(startDate, endDate);
  }

  // ============================================
  // Invoice Endpoints
  // ============================================

  /**
   * Generate invoice for a tenant
   * Admin only
   */
  @Post('invoices/generate')
  @UseGuards(AdminGuard)
  async generateInvoice(@Body() dto: GenerateInvoiceDto): Promise<InvoiceResponseDto> {
    this.logger.log(`Generating invoice for tenant ${dto.tenantId}`);
    const invoice = await this.invoiceService.generateInvoice(dto);
    return this.invoiceService.mapToResponseDto(invoice);
  }

  /**
   * Get invoice by ID
   * Admin only
   */
  @Get('invoices/:id')
  @UseGuards(AdminGuard)
  async getInvoice(@Param('id') id: string): Promise<InvoiceResponseDto> {
    this.logger.log(`Fetching invoice ${id}`);
    const invoice = await this.invoiceService.getInvoiceById(id);
    return this.invoiceService.mapToResponseDto(invoice);
  }

  /**
   * Get invoices with filters
   * Admin only
   */
  @Get('invoices')
  @UseGuards(AdminGuard)
  async getInvoices(@Query() query: InvoiceQueryDto): Promise<InvoiceResponseDto[]> {
    this.logger.log('Fetching invoices with filters');
    const invoices = await this.invoiceService.getInvoices(query);
    return invoices.map((invoice) => this.invoiceService.mapToResponseDto(invoice));
  }

  /**
   * Update invoice
   * Admin only
   */
  @Put('invoices/:id')
  @UseGuards(AdminGuard)
  async updateInvoice(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    this.logger.log(`Updating invoice ${id}`);
    const invoice = await this.invoiceService.updateInvoice(id, dto);
    return this.invoiceService.mapToResponseDto(invoice);
  }

  /**
   * Mark invoice as paid
   * Admin only
   */
  @Post('invoices/:id/mark-paid')
  @UseGuards(AdminGuard)
  async markInvoiceAsPaid(
    @Param('id') id: string,
    @Body() body: { paymentMethod: string; paymentTransactionId: string },
  ): Promise<InvoiceResponseDto> {
    this.logger.log(`Marking invoice ${id} as paid`);
    const invoice = await this.invoiceService.markAsPaid(
      id,
      body.paymentMethod,
      body.paymentTransactionId,
    );
    return this.invoiceService.mapToResponseDto(invoice);
  }

  /**
   * Cancel invoice
   * Admin only
   */
  @Post('invoices/:id/cancel')
  @UseGuards(AdminGuard)
  async cancelInvoice(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ): Promise<InvoiceResponseDto> {
    this.logger.log(`Cancelling invoice ${id}`);
    const invoice = await this.invoiceService.cancelInvoice(id, body.reason);
    return this.invoiceService.mapToResponseDto(invoice);
  }

  /**
   * Generate PDF for invoice
   * Admin only
   */
  @Post('invoices/:id/generate-pdf')
  @UseGuards(AdminGuard)
  async generateInvoicePdf(@Param('id') id: string): Promise<{ pdfUrl: string }> {
    this.logger.log(`Generating PDF for invoice ${id}`);
    const pdfUrl = await this.pdfGeneratorService.generatePdf(id);
    return { pdfUrl };
  }
}
