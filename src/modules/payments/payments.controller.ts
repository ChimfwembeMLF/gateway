import { Controller, Post, Body, Get, Param, UseGuards, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from 'src/common/guards/api-key.guard';
import { ApiTags, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';

@ApiTags('Payments')
@UseGuards(ApiKeyGuard)
@Controller('api/v1/payments')
export class PaymentsController {
    @Get()
    @ApiResponse({ status: 200, type: [Payment] })
    @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
    @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
    async findAll(@Req() req: Request): Promise<Payment[]> {
      const tenantId = (req.user as any)?.tenantId;
      if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
      return this.paymentsService.findAllByTenant(tenantId);
    }
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
    @ApiResponse({ status: 201, type: Payment })
    @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
    @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
  async create(@Body() createPaymentDto: CreatePaymentDto, @Req() req: Request): Promise<Payment> {
    const tenantId = (req.user as any)?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.create({ ...createPaymentDto, tenantId }, req.user);
  }

  @Get(':id')
    @ApiParam({ name: 'id', description: 'Payment ID' })
    @ApiResponse({ status: 200, type: Payment })
    @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
    @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<Payment> {
    const tenantId = (req.user as any)?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    const payment = await this.paymentsService.findOne(id, tenantId);
    if (!payment) throw new ForbiddenException('Payment not found or access denied.');
    return payment;
  }
}
