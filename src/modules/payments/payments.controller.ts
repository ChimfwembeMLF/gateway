import { Controller, Post, Body, Get, Param, UseGuards, UseInterceptors, Req, BadRequestException, ForbiddenException, Query } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from 'src/common/guards/api-key.guard';
import { ApiTags, ApiResponse, ApiParam, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';

@ApiTags('Payments')
@UseGuards(ApiKeyGuard)
@UseInterceptors(IdempotencyInterceptor)
@Controller('api/v1/payments')
export class PaymentsController {
    @Get()
    @ApiResponse({ status: 200, type: [Payment] })
    @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
    @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
    async findAll(@Req() req: any): Promise<Payment[]> {
      const tenantId = req.tenant?.id;
      if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
      return this.paymentsService.findAllByTenant(tenantId);
    }
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
    @ApiResponse({ status: 201, type: Payment })
    @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
    @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
    @ApiHeader({ name: 'Idempotency-Key', description: 'UUID for idempotent request deduplication (recommended)', required: false })
  async create(@Body() createPaymentDto: CreatePaymentDto, @Req() req: any): Promise<Payment> {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.create({ ...createPaymentDto, tenantId }, req.user);
  }

  @Get('status/:id')
    @ApiParam({ name: 'id', description: 'Payment ID' })
    @ApiQuery({ name: 'provider', required: false, description: 'Payment provider (mtn, airtel, etc). Defaults to mtn' })
    @ApiResponse({ status: 200, description: 'Payment status from provider' })
    @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
    @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
  async getStatus(@Param('id') id: string, @Query('provider') provider: string, @Req() req: any): Promise<any> {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.getPaymentStatus(id, tenantId, provider, req.user);
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
    return payment;
  }

  @Get('balance/available')
    @ApiQuery({ name: 'provider', required: false, description: 'Payment provider (mtn, airtel, etc). Defaults to mtn' })
    @ApiResponse({ status: 200, description: 'Wallet balance for the tenant' })
    @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
    @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
  async getBalance(@Query('provider') provider: string, @Req() req: any): Promise<any> {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    const balance = await this.paymentsService.getBalance(tenantId, provider, req.user);
    return { success: true, data: balance };
  }
}
