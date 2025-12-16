import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MtnService } from '../mtn/mtn.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly mtnService: MtnService,
    // Future: inject other provider services here
  ) {}

  async create(createPaymentDto: CreatePaymentDto & { tenantId: string }): Promise<Payment> {
    let providerResult: any;
    switch (createPaymentDto.provider.toLowerCase()) {
      case 'mtn':
        providerResult = await this.mtnService.requestToPay(
          createPaymentDto,
          createPaymentDto.bearerToken || '',
          createPaymentDto.transactionId || '',
        );
        break;
      // case 'airtel':
      //   providerResult = await this.airtelService.requestToPay(createPaymentDto);
      //   break;
      // case 'zamtel':
      //   providerResult = await this.zamtelService.requestToPay(createPaymentDto);
      //   break;
      default:
        throw new BadRequestException('Unsupported provider');
    }
    // Save payment with provider result (e.g., transactionId)
    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      status: PaymentStatus.PENDING,
      momoTransactionId: providerResult?.transactionId || null,
      tenantId: createPaymentDto.tenantId,
    });
    return this.paymentRepository.save(payment);
  }

  async findOne(id: string, tenantId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id, tenantId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async updateStatus(id: string, status: PaymentStatus, tenantId: string): Promise<Payment> {
    const payment = await this.findOne(id, tenantId);
    payment.status = status;
    return this.paymentRepository.save(payment);
  }
}
