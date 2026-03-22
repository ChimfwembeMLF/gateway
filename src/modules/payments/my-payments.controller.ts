import { Controller, Get, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('My Payments')
@UseGuards(ApiKeyGuard)
@Controller('api/v1/my/payments')
export class MyPaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiResponse({ status: 200, type: [Payment], description: 'List of payments for the current user/tenant' })
  @ApiHeader({ name: 'x-api-key', description: 'API key for authentication', required: true })
  @ApiHeader({ name: 'x-tenant-id', description: 'Tenant ID for multi-tenancy', required: true })
  async findAll(
    @Query('status') status?: string,
    @Query('provider') provider?: string,
    @Query('network') network?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Req() req?: any
  ): Promise<Payment[]> {
    const tenantId = req.tenant?.id;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    const filters: any = { tenantId };
    if (status) filters.status = status;
    if (provider) filters.provider = provider;
    if (network) filters.network = network;
    if (from || to) filters.createdAt = {};
    if (from) filters.createdAt['$gte'] = new Date(from);
    if (to) filters.createdAt['$lte'] = new Date(to);
    return this.paymentsService.findAllWithFilters(filters);
  }
}
