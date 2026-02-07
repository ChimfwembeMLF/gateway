import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Disbursement, DisbursementStatus, DisbursementType, DisbursementTransaction, TransactionStatus } from '../entities';
import { CreateTransferDto, CreateDepositDto, CreateRefundDto } from '../dto/disbursement.dto';

@Injectable()
export class BalanceValidationService {
  private readonly logger = new Logger(BalanceValidationService.name);

  constructor(
    @InjectRepository(Disbursement)
    private readonly disbursementRepository: Repository<Disbursement>,
  ) {}

  /**
   * Validate if tenant has sufficient balance for disbursement
   * For MTN, this is a preliminary check before API call
   */
  async validateSufficientBalance(
    tenantId: string,
    amount: number,
    currency: string,
  ): Promise<boolean> {
    this.logger.log(
      `Validating balance for tenant ${tenantId}: ${amount} ${currency}`,
    );

    // TODO: Implement actual balance check from tenant account
    // This would typically call:
    // 1. MTN Account Balance API
    // 2. Tenant's internal balance cache
    // 3. Account service

    // For now, accept all (will fail at MTN API if insufficient)
    return true;
  }

  /**
   * Get current balance for tenant account
   */
  async getAccountBalance(
    tenantId: string,
    currency: string,
  ): Promise<number> {
    this.logger.log(
      `Fetching account balance for tenant ${tenantId} in ${currency}`,
    );

    // TODO: Call MTN Account Balance API or cache

    return 0;
  }

  /**
   * Calculate available balance after pending disbursements
   */
  async getAvailableBalance(
    tenantId: string,
    currency: string,
  ): Promise<number> {
    const totalBalance = await this.getAccountBalance(tenantId, currency);

    // Sum pending disbursements
    const pendingDisbursements = await this.disbursementRepository
      .createQueryBuilder('d')
      .where('d.tenantId = :tenantId', { tenantId })
      .andWhere('d.currency = :currency', { currency })
      .andWhere('d.status = :status', { status: DisbursementStatus.PENDING })
      .select('SUM(d.amount)', 'totalAmount')
      .getRawOne();

    const pendingAmount = pendingDisbursements?.totalAmount || 0;

    return totalBalance - pendingAmount;
  }
}
