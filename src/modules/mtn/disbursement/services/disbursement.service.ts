import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import axios, { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import {
  Disbursement,
  DisbursementStatus,
  DisbursementType,
  DisbursementTransaction,
  TransactionStatus,
} from '../entities';
import {
  CreateTransferDto,
  CreateDepositDto,
  CreateRefundDto,
  DisbursementStatusDto,
} from '../dto/disbursement.dto';
import { BalanceValidationService } from './balance-validation.service';
import { DisbursementErrorHandler } from './disbursement-error.handler';

@Injectable()
export class DisbursementService {
  private readonly logger = new Logger(DisbursementService.name);

  private readonly mtnDisbursementUrl = process.env.MTN_DISBURSEMENT_URL || 'https://sandbox.momodeveloper.mtn.com/disbursement/v1_0';
  private readonly mtnApiKey = process.env.MTN_SUBSCRIPTION_KEY || '';

  constructor(
    @InjectRepository(Disbursement)
    private readonly disbursementRepository: Repository<Disbursement>,
    @InjectRepository(DisbursementTransaction)
    private readonly transactionRepository: Repository<DisbursementTransaction>,
    private readonly balanceValidationService: BalanceValidationService,
    private readonly errorHandler: DisbursementErrorHandler,
  ) {}

  /**
   * Create and process a transfer
   */
  async transfer(
    tenantId: string,
    dto: CreateTransferDto,
    callbackUrl?: string,
  ): Promise<DisbursementStatusDto> {
    this.logger.log(
      `Processing transfer for tenant ${tenantId}: ${dto.amount} ${dto.currency} to ${dto.payee.partyId}`,
    );

    // Validate balance
    const hasBalance = await this.balanceValidationService.validateSufficientBalance(
      tenantId,
      dto.amount,
      dto.currency,
    );
    if (!hasBalance) {
      throw new BadRequestException('Insufficient balance for transfer');
    }

    // Create disbursement record
    const disbursement = await this.disbursementRepository.save({
      tenantId,
      type: DisbursementType.TRANSFER,
      status: DisbursementStatus.PENDING,
      externalId: dto.externalId,
      amount: dto.amount,
      currency: dto.currency,
      payeeType: dto.payee.partyIdType,
      payeeId: dto.payee.partyId,
      payerMessage: dto.payerMessage,
      payeeNote: dto.payeeNote,
      mtnCallbackUrl: callbackUrl,
      provider: 'MTN',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Process with MTN API
    await this.processMtnTransfer(disbursement);

    return this.mapToStatusDto(disbursement);
  }

  /**
   * Create and process a deposit
   */
  async deposit(
    tenantId: string,
    dto: CreateDepositDto,
    callbackUrl?: string,
  ): Promise<DisbursementStatusDto> {
    this.logger.log(
      `Processing deposit for tenant ${tenantId}: ${dto.amount} ${dto.currency}`,
    );

    const disbursement = await this.disbursementRepository.save({
      tenantId,
      type: DisbursementType.DEPOSIT,
      status: DisbursementStatus.PENDING,
      externalId: dto.externalId,
      amount: dto.amount,
      currency: dto.currency,
      payeeType: dto.payee.partyIdType,
      payeeId: dto.payee.partyId,
      payerMessage: dto.payerMessage,
      payeeNote: dto.payeeNote,
      mtnCallbackUrl: callbackUrl,
      provider: 'MTN',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await this.processMtnDeposit(disbursement);

    return this.mapToStatusDto(disbursement);
  }

  /**
   * Create and process a refund
   */
  async refund(
    tenantId: string,
    dto: CreateRefundDto,
    callbackUrl?: string,
  ): Promise<DisbursementStatusDto> {
    this.logger.log(
      `Processing refund for tenant ${tenantId}: ${dto.amount} ${dto.currency}`,
    );

    // Validate original transaction exists
    const originalDisbursement = await this.disbursementRepository.findOne({
      where: { id: dto.referenceIdToRefund, tenantId },
    });

    if (!originalDisbursement) {
      throw new BadRequestException('Original transaction not found');
    }

    const disbursement = await this.disbursementRepository.save({
      tenantId,
      type: DisbursementType.REFUND,
      status: DisbursementStatus.PENDING,
      externalId: dto.externalId,
      amount: dto.amount,
      currency: dto.currency,
      payeeType: originalDisbursement.payeeType,
      payeeId: originalDisbursement.payeeId,
      payerMessage: dto.payerMessage,
      payeeNote: dto.payeeNote,
      mtnCallbackUrl: callbackUrl,
      provider: 'MTN',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await this.processMtnRefund(disbursement);

    return this.mapToStatusDto(disbursement);
  }

  /**
   * Get disbursement status
   */
  async getStatus(tenantId: string, disbursementId: string): Promise<DisbursementStatusDto> {
    const disbursement = await this.disbursementRepository.findOne({
      where: { id: disbursementId, tenantId },
      relations: ['transactions'],
    });

    if (!disbursement) {
      throw new BadRequestException('Disbursement not found');
    }

    return this.mapToStatusDto(disbursement);
  }

  /**
   * Process transfer with MTN API
   */
  private async processMtnTransfer(disbursement: Disbursement): Promise<void> {
    const startTime = Date.now();
    const mtnTransactionId = randomUUID();

    try {
      this.logger.log(
        `Initiating MTN transfer ${mtnTransactionId} for disbursement ${disbursement.id}`,
      );

      const payload = {
        amount: disbursement.amount.toString(),
        currency: disbursement.currency,
        externalId: disbursement.externalId,
        payee: {
          partyIdType: disbursement.payeeType,
          partyId: disbursement.payeeId,
        },
        payerMessage: disbursement.payerMessage,
        payeeNote: disbursement.payeeNote,
      };

      const response = await axios.post(
        `${this.mtnDisbursementUrl}/transfer`,
        payload,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.mtnApiKey,
            'X-Reference-Id': mtnTransactionId,
            'X-Target-Environment': process.env.MTN_TARGET_ENVIRONMENT || 'sandbox',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      disbursement.mtnTransactionId = mtnTransactionId;
      disbursement.status = DisbursementStatus.SUCCESSFUL;
      disbursement.completedAt = new Date();

      await this.disbursementRepository.save(disbursement);
      await this.logTransaction(
        disbursement,
        mtnTransactionId,
        TransactionStatus.COMPLETED,
        response.status,
        payload,
        response.data,
        Date.now() - startTime,
      );

      this.logger.log(`Transfer ${mtnTransactionId} completed successfully`);
    } catch (error) {
      await this.handleTransferError(disbursement, error, startTime, mtnTransactionId);
    }
  }

  /**
   * Process deposit with MTN API
   */
  private async processMtnDeposit(disbursement: Disbursement): Promise<void> {
    const startTime = Date.now();
    const mtnTransactionId = randomUUID();

    try {
      this.logger.log(`Initiating MTN deposit ${mtnTransactionId}`);

      const payload = {
        amount: disbursement.amount.toString(),
        currency: disbursement.currency,
        externalId: disbursement.externalId,
        payee: {
          partyIdType: disbursement.payeeType,
          partyId: disbursement.payeeId,
        },
        payerMessage: disbursement.payerMessage,
        payeeNote: disbursement.payeeNote,
      };

      const response = await axios.post(
        `${this.mtnDisbursementUrl}/deposit`,
        payload,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.mtnApiKey,
            'X-Reference-Id': mtnTransactionId,
            'X-Target-Environment': process.env.MTN_TARGET_ENVIRONMENT || 'sandbox',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      disbursement.mtnTransactionId = mtnTransactionId;
      disbursement.status = DisbursementStatus.SUCCESSFUL;
      disbursement.completedAt = new Date();

      await this.disbursementRepository.save(disbursement);
      await this.logTransaction(
        disbursement,
        mtnTransactionId,
        TransactionStatus.COMPLETED,
        response.status,
        payload,
        response.data,
        Date.now() - startTime,
      );

      this.logger.log(`Deposit ${mtnTransactionId} completed successfully`);
    } catch (error) {
      await this.handleTransferError(disbursement, error, startTime, mtnTransactionId);
    }
  }

  /**
   * Process refund with MTN API
   */
  private async processMtnRefund(disbursement: Disbursement): Promise<void> {
    const startTime = Date.now();
    const mtnTransactionId = randomUUID();

    try {
      this.logger.log(`Initiating MTN refund ${mtnTransactionId}`);

      const payload = {
        amount: disbursement.amount.toString(),
        currency: disbursement.currency,
        externalId: disbursement.externalId,
        payerMessage: disbursement.payerMessage,
        payeeNote: disbursement.payeeNote,
        referenceIdToRefund: disbursement.id, // Original transaction being refunded
      };

      const response = await axios.post(
        `${this.mtnDisbursementUrl}/refund`,
        payload,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': this.mtnApiKey,
            'X-Reference-Id': mtnTransactionId,
            'X-Target-Environment': process.env.MTN_TARGET_ENVIRONMENT || 'sandbox',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      disbursement.mtnTransactionId = mtnTransactionId;
      disbursement.status = DisbursementStatus.SUCCESSFUL;
      disbursement.completedAt = new Date();

      await this.disbursementRepository.save(disbursement);
      await this.logTransaction(
        disbursement,
        mtnTransactionId,
        TransactionStatus.COMPLETED,
        response.status,
        payload,
        response.data,
        Date.now() - startTime,
      );

      this.logger.log(`Refund ${mtnTransactionId} completed successfully`);
    } catch (error) {
      await this.handleTransferError(disbursement, error, startTime, mtnTransactionId);
    }
  }

  /**
   * Handle transfer/deposit/refund errors
   */
  private async handleTransferError(
    disbursement: Disbursement,
    error: any,
    startTime: number,
    mtnTransactionId: string,
  ): Promise<void> {
    const errorResponse = error?.response?.data || error.message;
    const mappedError = this.errorHandler.mapMtnError(errorResponse);

    this.logger.error(
      `Disbursement ${disbursement.id} failed: ${mappedError.code} - ${mappedError.message}`,
      error,
    );

    const isRetryable = this.errorHandler.isRetryable(mappedError);

    if (isRetryable && disbursement.retryCount < 5) {
      disbursement.status = DisbursementStatus.PENDING;
      disbursement.retryCount += 1;
      disbursement.nextRetryAt = this.errorHandler.calculateNextRetry(
        disbursement.retryCount,
      );
    } else {
      disbursement.status = DisbursementStatus.FAILED;
      disbursement.completedAt = new Date();
    }

    disbursement.errorDetails = {
      code: mappedError.code,
      message: mappedError.message,
      reason: mappedError.isRetryable ? `Will retry (attempt ${disbursement.retryCount}/5)` : 'No retry',
    };

    await this.disbursementRepository.save(disbursement);
    await this.logTransaction(
      disbursement,
      mtnTransactionId,
      TransactionStatus.FAILED,
      error?.response?.status || 500,
      null,
      errorResponse,
      Date.now() - startTime,
      mappedError,
    );
  }

  /**
   * Log transaction details
   */
  private async logTransaction(
    disbursement: Disbursement,
    mtnTransactionId: string,
    status: TransactionStatus,
    httpStatusCode: number,
    requestPayload: any,
    responsePayload: any,
    durationMs: number,
    error?: any,
  ): Promise<void> {
    const transaction = new DisbursementTransaction();
    transaction.disbursementId = disbursement.id;
    transaction.status = status;
    transaction.mtnTransactionId = mtnTransactionId;
    transaction.provider = 'MTN';
    transaction.httpStatusCode = httpStatusCode;
    transaction.requestPayload = requestPayload;
    transaction.responsePayload = responsePayload;
    if (error) {
      transaction.errorDetails = {
        code: error.code,
        message: error.message,
        httpStatus: error.httpStatus,
      };
    }
    transaction.durationMs = durationMs;

    await this.transactionRepository.save(transaction);
  }

  /**
   * Map disbursement to DTO
   */
  private mapToStatusDto(disbursement: Disbursement): DisbursementStatusDto {
    return {
      id: disbursement.id,
      type: disbursement.type,
      status: disbursement.status,
      amount: disbursement.amount,
      currency: disbursement.currency,
      externalId: disbursement.externalId,
      mtnTransactionId: disbursement.mtnTransactionId,
      errorDetails: disbursement.errorDetails,
      createdAt: disbursement.createdAt,
      completedAt: disbursement.completedAt,
      retryCount: disbursement.retryCount,
    };
  }

  /**
   * Cleanup expired disbursements (optional scheduled task)
   */
  async cleanupExpiredDisbursements(): Promise<void> {
    const now = new Date();
    const result = await this.disbursementRepository
      .createQueryBuilder('disbursement')
      .update()
      .set({ status: DisbursementStatus.EXPIRED })
      .where('disbursement.expiresAt < :now', { now })
      .andWhere('disbursement.status = :status', { status: DisbursementStatus.PENDING })
      .execute();

    this.logger.log(`Marked ${result.affected} expired disbursements as expired`);
  }
}
