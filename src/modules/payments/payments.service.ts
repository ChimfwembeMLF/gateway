import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CollectionService } from '../mtn/collection/collection.service';
import { MtnPartyIdType } from '../mtn/dto/mtn.enums';
import { PaymentProvider } from '../../common/enums/provider.enum';
import { ensureUuid } from '../../common/utils/uuid.util';

@Injectable()
export class PaymentsService {

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly collectionService: CollectionService,
    // Future: inject other provider services here
  ) {}

  async findAllByTenant(tenantId: string): Promise<Payment[]> {
    return this.paymentRepository.find({ where: { tenantId } });
  }
  
  async create(createPaymentDto: CreatePaymentDto & { tenantId: string }): Promise<Payment> {
    let providerResult: any;
    switch (createPaymentDto.provider.toLowerCase()) {
      case 'mtn': {
        // Use utility to ensure valid UUID
        const externalId = ensureUuid(createPaymentDto.externalId);
        try {
          // Transform CreatePaymentDto to RequestToPayDto
          const requestToPayDto = {
            amount: String(createPaymentDto.amount),
            currency: createPaymentDto.currency || 'ZMW',
            externalId,
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
          // Enhanced error handling for MoMo API
          const errData = error?.response?.data;
          let userMessage = 'MTN requestToPay failed.';
          if (errData?.code) {
            switch (errData.code) {
              case 'NOT_ENOUGH_FUNDS':
                userMessage = 'The payer does not have enough funds. Please ensure sufficient MoMo balance.';
                break;
              case 'PAYER_NOT_FOUND':
                userMessage = 'Payer does not exist. Confirm the payer has an active MoMo Wallet.';
                break;
              case 'TRANSACTION_NOT_FOUND':
                userMessage = 'Transaction could not be found.';
                break;
              case 'PAYEE_NOT_ALLOWED_TO_RECEIVE':
                userMessage = 'Payee cannot receive funds. Request an alternative MoMo number.';
                break;
              case 'SENDER_ACCOUNT_NOT_ACTIVE':
                userMessage = 'Sender account not active. Contact your account manager to activate the wallet.';
                break;
              case 'COULD_NOT_PERFORM_TRANSACTION':
                userMessage = 'Transaction not completed. If timed out, please retry within 5 minutes.';
                break;
              case 'PAYER_LIMIT_REACHED':
                userMessage = "Payer's wallet limit reached. Reduce debit amount or use another wallet.";
                break;
              case 'PAYEE_LIMIT_REACHED':
                userMessage = "Payee's wallet limit reached. Reduce transfer amount or use another wallet.";
                break;
              case 'RESOURCE_ALREADY_EXIST':
                userMessage = 'Duplicated reference id. Use a new, unique UUID for X-Reference-Id.';
                break;
              case 'PAYEE_NOT_FOUND':
                userMessage = 'Payee does not exist or account is blocked.';
                break;
              case 'VALIDATION_ERROR':
                userMessage = 'Validation error: Check data types, field lengths, currency, and message/note content.';
                break;
              default:
                userMessage = errData.message || userMessage;
            }
          } else if (error?.message) {
            userMessage += ' ' + error.message;
          }
          // Log error details for debugging
          console.error('[PaymentsService] MTN requestToPay error:', {
            error: error?.message,
            response: errData,
            requestData: createPaymentDto,
          });
          throw new BadRequestException(userMessage);
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
    const savedPayment = await this.paymentRepository.save(payment);

    // Save transaction record for MTN requestToPay
    if (createPaymentDto.provider.toLowerCase() === 'mtn') {
      await this.transactionRepository.save({
        tenantId: createPaymentDto.tenantId,
        payment: savedPayment,
        type: TransactionType.REQUEST_TO_PAY,
        momoReferenceId: providerResult?.transactionId || undefined,
        response: providerResult ? JSON.stringify(providerResult) : '',
        status: PaymentStatus.PENDING,
      });
    }
    return savedPayment;
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
