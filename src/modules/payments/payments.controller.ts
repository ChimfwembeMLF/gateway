import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleType } from '../../common/enums/role-type.enum';
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

    // Admin portal endpoint: Get payment status using JWT (no API key required)
  @Get('portal/status/:id')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiQuery({ name: 'provider', required: false, description: 'Payment provider (mtn, airtel, etc). Defaults to mtn' })
  @ApiResponse({ status: 200, description: 'Payment status from provider (portal)' })
  async getStatusFromPortal(@Param('id') id: string, @Query('provider') provider: string, @Req() req: any): Promise<any> {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in user context.');
    return this.paymentsService.getPaymentStatus(id, tenantId, provider, req.user);
  }

  // Admin portal endpoint: Get payment by ID using JWT (no API key required)
  @Get('portal/:id')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, type: Payment, description: 'Payment fetched from admin portal' })
  async findOneFromPortal(@Param('id') id: string, @Req() req: any): Promise<Payment> {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in user context.');
    const payment = await this.paymentsService.findOne(id, tenantId);
    if (!payment) throw new ForbiddenException('Payment not found or access denied.');
    return payment;
  }

  // Admin portal endpoint: Get balance using JWT (no API key required)
  @Get('portal/balance/available')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiQuery({ name: 'provider', required: false, description: 'Payment provider (mtn, airtel, etc). Defaults to mtn' })
  @ApiResponse({ status: 200, description: 'Wallet balance for the tenant (portal)' })
  async getBalanceFromPortal(@Query('provider') provider: string, @Req() req: any): Promise<any> {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in user context.');
    const balance = await this.paymentsService.getBalance(tenantId, provider, req.user);
    return { success: true, data: balance };
  }
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
  // Admin portal endpoint: Get payments using JWT (no API key required)
  @Get('portal')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiResponse({ status: 200, type: [Payment], description: 'Payments fetched from admin portal' })
  async getFromPortal(@Req() req: any): Promise<Payment[]> {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in user context.');
    return this.paymentsService.findAllByTenant(tenantId);
  }
  
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

    // Admin portal endpoint: Make payment using JWT (no API key required)
  @Post('portal')
  @UseGuards(AuthGuard(), RolesGuard)
  @Roles(RoleType.ADMIN, RoleType.SUPER_ADMIN)
  @ApiResponse({ status: 201, type: Payment, description: 'Payment created from admin portal' })
  async createFromPortal(@Body() createPaymentDto: CreatePaymentDto, @Req() req: any): Promise<Payment> {
    const tenantId = req.user.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in user context.');
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
