import { RoleType } from '../../common/enums/role-type.enum';
import { Controller, Post, Body, Get, Param, UseGuards, UseInterceptors, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from 'src/common/guards/api-key.guard';
import { ApiTags, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';
import { Auth } from 'src/common/decorators/auth.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Payments')
@UseGuards(ApiKeyGuard)
@UseInterceptors(IdempotencyInterceptor)
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
    @ApiResponse({ status: 201, type: Payment })
    @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
    @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
    @ApiHeader({ name: 'Idempotency-Key', description: 'UUID for idempotent request deduplication (recommended)', required: false })
  async create(@Body() createPaymentDto: CreatePaymentDto, @Req() req: any): Promise<Payment> {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    if (!createPaymentDto.network) throw new BadRequestException('Missing required field: network');
    if (!createPaymentDto.payer) throw new BadRequestException('Missing required field: payer');
    return this.paymentsService.create({ ...createPaymentDto, tenantId }, req.user);
  }

  @Get('status/:id')
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment status from pawaPay' })
  @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
  @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
  async getStatus(@Param('id') id: string, @Req() req: any): Promise<any> {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.getPaymentStatus(id, tenantId, 'pawaPay', req.user);
  }

  @Get(':id')
    @ApiParam({ name: 'id', description: 'Payment ID' })
    @ApiResponse({ status: 200, type: Payment })
    @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
    @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
  async findOne(@Param('id') id: string, @Req() req: any): Promise<Payment> {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    const payment = await this.paymentsService.findOne(id, tenantId);
    if (!payment) throw new ForbiddenException('Payment not found or access denied.');
    // Return payment with externalId explicitly included for frontend
    return {
      ...payment,
      externalId: payment.externalId,
    };
  }

  @Get('balance/available')
  @ApiResponse({ status: 200, description: 'Wallet balance for the tenant (pawaPay only)' })
  @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
  @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
  async getBalance(@Req() req: any): Promise<any> {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    const balance = await this.paymentsService.getBalance(tenantId, 'pawaPay', req.user);
    return { success: true, data: balance };
  }
  // --- pawaPay passthrough endpoints ---

  @Post('bulk-payouts')
  async initiateBulkPayouts(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.initiateBulkPayouts({ ...dto, tenantId });
  }

  @Post('payout-status')
  async checkPayoutStatus(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.checkPayoutStatus({ ...dto, tenantId });
  }

  @Post('payout-resend-callback')
  async resendPayoutCallback(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.resendPayoutCallback({ ...dto, tenantId });
  }

  @Post('payout-cancel')
  async cancelEnqueuedPayout(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.cancelEnqueuedPayout({ ...dto, tenantId });
  }

  @Post('deposit')
  async initiateDeposit(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.initiateDeposit({ ...dto, tenantId });
  }

  @Post('deposit-status')
  async checkDepositStatus(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.checkDepositStatus({ ...dto, tenantId });
  }

  @Post('deposit-resend-callback')
  async resendDepositCallback(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.resendDepositCallback({ ...dto, tenantId });
  }

  @Post('refund')
  async initiateRefund(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.initiateRefund({ ...dto, tenantId });
  }

  @Post('refund-status')
  async checkRefundStatus(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.checkRefundStatus({ ...dto, tenantId });
  }

  @Post('refund-resend-callback')
  async resendRefundCallback(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.resendRefundCallback({ ...dto, tenantId });
  }

  @Post('payment-page')
  async depositViaPaymentPage(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.depositViaPaymentPage({ ...dto, tenantId });
  }

  @Post('provider-availability')
  async providerAvailability(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.providerAvailability({ ...dto, tenantId });
  }

  @Post('active-configuration')
  async activeConfiguration(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.activeConfiguration({ ...dto, tenantId });
  }

  @Post('predict-provider')
  async predictProvider(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.predictProvider({ ...dto, tenantId });
  }

  @Post('public-keys')
  async publicKeys(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.publicKeys({ ...dto, tenantId });
  }

  @Post('wallet-balances')
  async walletBalances(@Body() dto: any, @Req() req: any) {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.walletBalances({ ...dto, tenantId });
  }
}
