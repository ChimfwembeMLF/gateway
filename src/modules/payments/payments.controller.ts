import { Controller, Post, Body, Get, Param, UseGuards, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from 'src/common/guards/api-key.guard';
import { ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';

@ApiTags('Payments')
@UseGuards(ApiKeyGuard)
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiResponse({ status: 201, type: Payment })
  async create(@Body() createPaymentDto: CreatePaymentDto, @Req() req: Request): Promise<Payment> {
    const tenantId = (req.user as any)?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    return this.paymentsService.create({ ...createPaymentDto, tenantId });
  }

  @Get(':id')
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, type: Payment })
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<Payment> {
    const tenantId = (req.user as any)?.tenantId;
    if (!tenantId) throw new BadRequestException('Missing tenantId in request.');
    const payment = await this.paymentsService.findOne(id, tenantId);
    if (!payment) throw new ForbiddenException('Payment not found or access denied.');
    return payment;
  }
}
