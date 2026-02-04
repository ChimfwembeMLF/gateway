import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CollectionService } from '../mtn/collection/collection.service';
import { DisbursementService } from '../mtn/disbursement/disbursement.service';
import { MtnPartyIdType } from '../mtn/dto/mtn.enums';
import { PaymentProvider } from '../../common/enums/provider.enum';
import { UuidGeneratorService } from './external-id.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly collectionService: CollectionService,
    private readonly disbursementService: DisbursementService,
    private readonly uuidGenerator: UuidGeneratorService,
    // Future: inject other provider services here
  ) {}

  async findAllByTenant(tenantId: string): Promise<Payment[]> {
    return this.paymentRepository.find({ where: { tenantId } });
  }
  
  async create(createPaymentDto: CreatePaymentDto & { tenantId: string }, user: any): Promise<Payment> {
    let providerResult: any;
    // Always ensure externalId is set
    const paymentExternalId = createPaymentDto.externalId
      ? createPaymentDto.externalId
      : this.uuidGenerator.generate();
    const momoReferenceId = this.uuidGenerator.generate();
    switch (createPaymentDto.provider) {
      case PaymentProvider.MTN: {
        try {
          // Transform CreatePaymentDto to RequestToPayDto
          const requestToPayDto = {
            amount: String(createPaymentDto.amount),
            currency: createPaymentDto.currency || 'ZMW',
            externalId: momoReferenceId,
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
            user,
            paymentExternalId,
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
          this.logger.error('[PaymentsService] MTN requestToPay error:', {
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
      externalId: paymentExternalId, // always set
      status: PaymentStatus.PENDING,
      momoTransactionId: providerResult?.transactionId || momoReferenceId,
      tenantId: createPaymentDto.tenantId,
    });
    const savedPayment = await this.paymentRepository.save(payment);

    // Save transaction record for MTN requestToPay
    if (createPaymentDto.provider === PaymentProvider.MTN) {
      await this.transactionRepository.save({
        tenantId: createPaymentDto.tenantId,
        payment: savedPayment,
        type: TransactionType.REQUEST_TO_PAY,
        momoReferenceId: providerResult?.transactionId || momoReferenceId,
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

  async getPaymentStatus(
    paymentId: string,
    tenantId: string,
    provider?: string,
    user?: any,
  ): Promise<any> {
    const payment = await this.findOne(paymentId, tenantId);
    const providerToQuery = provider?.toUpperCase() || PaymentProvider.MTN;

    switch (providerToQuery) {
      case PaymentProvider.MTN: {
        const transactionId = payment.momoTransactionId || payment.externalId;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!transactionId || !uuidRegex.test(transactionId)) {
          throw new BadRequestException(
            'Payment does not have a valid MTN referenceId yet. Create a new payment to get a valid referenceId.',
          );
        }
        const status = await this.collectionService.getRequestToPayStatus(transactionId, tenantId, user);
        return { payment, status };
      }
      default:
        throw new BadRequestException(`Provider ${providerToQuery} not supported for status lookup`);
    }
  }

  async getBalance(tenantId: string, provider?: string, user?: any): Promise<any> {
    // If no provider specified, return MTN balance (default)
    const providerToQuery = provider?.toUpperCase() || PaymentProvider.MTN;

    try {
      switch (providerToQuery) {
        case PaymentProvider.MTN:
          try {
            return await this.disbursementService.getAccountBalance(tenantId, user);
          } catch (error) {
            this.logger.warn('Disbursement balance failed, falling back to collection balance');
            return await this.collectionService.getAccountBalance(tenantId, user);
          }
        // TODO: Add other providers (Airtel, Vodafone, etc.)
        // case PaymentProvider.AIRTEL:
        //   return this.airtelService.getAccountBalance(tenantId, user);
        default:
          throw new BadRequestException(`Provider ${providerToQuery} not supported or balance endpoint not available`);
      }
    } catch (error) {
      this.logger.error(`Failed to get balance for provider ${providerToQuery}`, {
        tenantId,
        error: error?.message,
        details: error?.response?.data || error,
      });
      throw error;
    }
  }
}
