import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CollectionService } from '../mtn/collection/collection.service';
import { MtnPartyIdType } from '../mtn/dto/mtn.enums';
import { PaymentProvider } from '../../common/enums/provider.enum';
import { randomUUID } from 'crypto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly collectionService: CollectionService,
    // Future: inject other provider services here
  ) {}

  async create(createPaymentDto: CreatePaymentDto & { tenantId: string }): Promise<Payment> {
    let providerResult: any;
    switch (createPaymentDto.provider.toLowerCase()) {
      case 'mtn': {
        const transactionId = randomUUID();
        try {
          // Transform CreatePaymentDto to RequestToPayDto
          const requestToPayDto = {
            amount: String(createPaymentDto.amount),
            currency: createPaymentDto.currency || 'ZMW',
            externalId: createPaymentDto.externalId,
            payer: {
              partyIdType: MtnPartyIdType.MSISDN,
              partyId: createPaymentDto.payer,
            },
            payerMessage: createPaymentDto.payerMessage,
            payeeNote: createPaymentDto.payeeNote,
          };
          providerResult = await this.collectionService.requestToPay(
            requestToPayDto,
            createPaymentDto.tenantId,
          );
        } catch (error) {
          // Log error details for debugging
          console.error('[PaymentsService] MTN requestToPay error:', {
            error: error?.message,
            response: error?.response?.data,
            requestData: createPaymentDto,
          });
          throw new BadRequestException('MTN requestToPay failed: ' + (error?.message || 'Unknown error'));
        }
        break;
      }
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
