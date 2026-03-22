import { Injectable, NotFoundException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { normalizeZambiaNetwork } from '../../common/utils/network-normalizer.util';
// import { PaymentProvider } from '../../common/enums/provider.enum';
import { UuidGeneratorService } from './external-id.service';
// import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PawapayService } from '../pawapay/pawapay.service';
import { InitiatePayoutDto } from '../pawapay/dtos/initiate-payout.dto';
import { InitiateBulkPayoutsDto } from '../pawapay/dtos/initiate-bulk-payouts.dto';
import { CheckPayoutStatusDto } from '../pawapay/dtos/check-payout-status.dto';
import { ResendPayoutCallbackDto } from '../pawapay/dtos/resend-payout-callback.dto';
import { CancelEnqueuedPayoutDto } from '../pawapay/dtos/cancel-enqueued-payout.dto';
import { InitiateDepositDto } from '../pawapay/dtos/initiate-deposit.dto';
import { CheckDepositStatusDto } from '../pawapay/dtos/check-deposit-status.dto';
import { ResendDepositCallbackDto } from '../pawapay/dtos/resend-deposit-callback.dto';
import { InitiateRefundDto } from '../pawapay/dtos/initiate-refund.dto';
import { CheckRefundStatusDto } from '../pawapay/dtos/check-refund-status.dto';
import { ResendRefundCallbackDto } from '../pawapay/dtos/resend-refund-callback.dto';
import { DepositViaPaymentPageDto } from '../pawapay/dtos/deposit-via-payment-page.dto';
import { ProviderAvailabilityDto } from '../pawapay/dtos/provider-availability.dto';
import { ActiveConfigurationDto } from '../pawapay/dtos/active-configuration.dto';
import { PredictProviderDto } from '../pawapay/dtos/predict-provider.dto';
import { PublicKeysDto } from '../pawapay/dtos/public-keys.dto';
import { WalletBalancesDto } from '../pawapay/dtos/wallet-balances.dto';
import { ZambiaNetwork } from 'src/common/enums/zambia-network.enum';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly uuidGenerator: UuidGeneratorService,
    private readonly configService: ConfigService,
    private readonly pawapayService: PawapayService,
  ) { }

  async findAllByTenant(tenantId: string): Promise<Payment[]> {
    return this.paymentRepository.find({ where: { tenantId } });
  }

  async createMinimalPawapayDeposit(): Promise<any> {
    // Generate UUIDv4 for depositId
    const depositId = this.uuidGenerator.generate();
    const payload = {
      depositId,
      amount: "100",
      currency: "ZMW",
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: "250763456789",
          provider: "MTN_MOMO_RWA"
        }
      }
    };
    this.logger.debug('[pawaPay Minimal InitiateDepositDto payload]', JSON.stringify(payload));
    let providerResult: any = undefined;
    let providerError: any = undefined;
    try {
      providerResult = await this.pawapayService.initiateDeposit(payload);
      this.logger.debug('[pawaPay Minimal InitiateDepositDto response]', JSON.stringify(providerResult));
    } catch (error) {
      providerError = error;
      if (error?.response) {
        this.logger.error('pawaPay API error (full response):', JSON.stringify(error.response, null, 2));
        this.logger.error('pawaPay API error (data):', JSON.stringify(error.response.data, null, 2));
      } else {
        this.logger.error('pawaPay API error (raw):', JSON.stringify(error, null, 2));
      }
    }
    return providerResult || providerError;
  }

  async create(createPaymentDto: CreatePaymentDto & { tenantId: string }, user: any): Promise<Payment> {
    // Normalize network to ZambiaNetwork enum using util
    const normalizedNetwork = normalizeZambiaNetwork(createPaymentDto.network);
    // Always use a unique UUID for depositId
    const depositId = this.uuidGenerator.generate();
    // Use a distinct clientReferenceId if provided, else generate
    const clientReferenceId = createPaymentDto.clientReferenceId && createPaymentDto.clientReferenceId !== depositId
      ? createPaymentDto.clientReferenceId
      : `INV-${Math.floor(Math.random() * 1e8)}`;
    // Send amount as string, do not scale or multiply
    let amountStr = String(createPaymentDto.amount);
    // Validate metadata structure (should be array of objects)
    let metadata = undefined;
    if (Array.isArray(createPaymentDto.metadata) && createPaymentDto.metadata.length > 0) {
      metadata = createPaymentDto.metadata.map((item: any) => ({ ...item }));
    }
    // Build InitiateDepositDto payload with all required/optional fields
    const payload: any = {
      amount: amountStr,
      currency: createPaymentDto.currency || 'ZMW',
      depositId,
      payer: {
        type: 'MMO',
        accountDetails: {
          provider: normalizedNetwork,
          phoneNumber: createPaymentDto.payer,
        },
      },
      clientReferenceId,
    };
    if (createPaymentDto.preAuthorisationCode && createPaymentDto.preAuthorisationCode.trim() !== '') {
      payload.preAuthorisationCode = createPaymentDto.preAuthorisationCode;
    }
    if (createPaymentDto.payerMessage && createPaymentDto.payerMessage.trim() !== '') {
      // Truncate to 22 characters as required by pawaPay
      payload.customerMessage = createPaymentDto.payerMessage.trim().slice(0, 22);
    }
    if (metadata) {
      payload.metadata = metadata;
    }
    this.logger.debug('[pawaPay InitiateDepositDto payload]', JSON.stringify(payload));
    let providerResult: any = undefined;
    let providerError: any = undefined;
    try {
      providerResult = await this.pawapayService.initiateDeposit(payload);
      this.logger.debug('[pawaPay InitiateDepositDto response]', JSON.stringify(providerResult));
    } catch (error) {
      providerError = error;
      // Log the full error object for better debugging
      if (error?.response) {
        this.logger.error('pawaPay API error (full response):', JSON.stringify(error.response, null, 2));
        this.logger.error('pawaPay API error (data):', JSON.stringify(error.response.data, null, 2));
      } else {
        this.logger.error('pawaPay API error (raw):', JSON.stringify(error, null, 2));
      }
    }
    // Save payment with provider result (e.g., transactionId), status is PENDING if success, FAILED if error
    const payment = this.paymentRepository.create({
      // provider is set by default in entity, only set if needed
      network: normalizedNetwork as ZambiaNetwork,
      amount: createPaymentDto.amount,
      currency: createPaymentDto.currency,
      externalId: depositId,
      payer: createPaymentDto.payer,
      payerMessage: createPaymentDto.payerMessage,
      payeeNote: createPaymentDto.payeeNote,
      status: providerError ? PaymentStatus.FAILED : PaymentStatus.PENDING,
      providerTransactionId: providerResult?.transactionId,
      tenantId: createPaymentDto.tenantId,
      metadata: createPaymentDto.metadata,
    });
    const savedPayment = await this.paymentRepository.save(payment) as Payment;
    // Save transaction record for pawaPay async request
    await this.transactionRepository.save({
      tenantId: createPaymentDto.tenantId,
      paymentId: (savedPayment as any).id,
      type: TransactionType.REQUEST_TO_PAY,
      momoReferenceId: providerResult?.transactionId,
      response: providerResult ? JSON.stringify(providerResult) : (providerError ? JSON.stringify({ error: providerError?.message, details: providerError?.response?.data }) : ''),
      status: providerError ? PaymentStatus.FAILED : PaymentStatus.PENDING,
    });
    if (providerError) {
      // Attach provider error details to the returned payment object for client visibility
      (savedPayment as any).providerError = providerError?.response?.data || providerError?.response || providerError;
      return savedPayment as Payment;
    }
    return savedPayment as Payment;
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

  // normalizeMsisdn removed: not needed for pawaPay-only integration

  async getPaymentStatus(
    paymentId: string,
    tenantId: string,
    _provider?: string,
    user?: any,
  ): Promise<any> {
    const payment = await this.findOne(paymentId, tenantId);
    const status = await this.pawapayService.checkPayoutStatus({ payoutId: payment.providerTransactionId });
    return { payment, status };
  }

  async findAllWithFilters(filters: any): Promise<Payment[]> {
    // Convert $gte/$lte to TypeORM format if present
    const where: any = { ...filters };
    if (filters.createdAt) {
      where.createdAt = {};
      if (filters.createdAt['$gte']) where.createdAt['$gte'] = filters.createdAt['$gte'];
      if (filters.createdAt['$lte']) where.createdAt['$lte'] = filters.createdAt['$lte'];
    }
    return this.paymentRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async getBalance(tenantId: string, _provider?: string, user?: any): Promise<any> {
    // pawaPay is now the only provider
    try {
      // If walletBalances expects a DTO, pass an empty object or extend as needed
      const result = await this.pawapayService.walletBalances({});
      this.logger.debug(`[getBalance] tenantId=${tenantId} result=${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error('[getBalance] Error fetching wallet balances from pawaPay', error?.response?.data || error.message);
      throw new InternalServerErrorException('Failed to fetch wallet balances from pawaPay');
    }
  }

  // pawaPay API passthrough methods
  async initiatePayouts(payload: InitiateDepositDto) {
    const payoutPayload = {
      amount: payload.amount,
      currency: payload.currency,
      phoneNumber: payload.payer?.accountDetails?.phoneNumber,
      customerMessage: payload.customerMessage,
    };
    return this.pawapayService.initiatePayout(payoutPayload);
  }
  async initiateBulkPayouts(payload: InitiateBulkPayoutsDto) {
    return this.pawapayService.initiateBulkPayouts(payload);
  }

  async checkPayoutStatus(payload: CheckPayoutStatusDto) {
    return this.pawapayService.checkPayoutStatus(payload);
  }

  async resendPayoutCallback(payload: ResendPayoutCallbackDto) {
    return this.pawapayService.resendPayoutCallback(payload);
  }

  async cancelEnqueuedPayout(payload: CancelEnqueuedPayoutDto) {
    return this.pawapayService.cancelEnqueuedPayout(payload);
  }

  async initiateDeposit(payload: InitiateDepositDto) {
    return this.pawapayService.initiateDeposit(payload);
  }

  async checkDepositStatus(payload: CheckDepositStatusDto) {
    return this.pawapayService.checkDepositStatus(payload);
  }

  async resendDepositCallback(payload: ResendDepositCallbackDto) {
    return this.pawapayService.resendDepositCallback(payload);
  }

  async initiateRefund(payload: InitiateRefundDto) {
    return this.pawapayService.initiateRefund(payload);
  }

  async checkRefundStatus(payload: CheckRefundStatusDto) {
    return this.pawapayService.checkRefundStatus(payload);
  }

  async resendRefundCallback(payload: ResendRefundCallbackDto) {
    return this.pawapayService.resendRefundCallback(payload);
  }

  async depositViaPaymentPage(payload: DepositViaPaymentPageDto) {
    return this.pawapayService.depositViaPaymentPage(payload);
  }

  async providerAvailability(payload: ProviderAvailabilityDto) {
    return this.pawapayService.providerAvailability(payload);
  }

  async activeConfiguration(payload: ActiveConfigurationDto) {
    return this.pawapayService.activeConfiguration(payload);
  }

  async predictProvider(payload: PredictProviderDto) {
    return this.pawapayService.predictProvider(payload);
  }

  async publicKeys(payload: PublicKeysDto) {
    return this.pawapayService.publicKeys(payload);
  }

  async walletBalances(payload: WalletBalancesDto) {
    return this.pawapayService.walletBalances(payload);
  }
}
