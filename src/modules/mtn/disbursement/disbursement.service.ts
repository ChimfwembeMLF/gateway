import { ValidateAccountHolderStatusDto } from './dto/validate-account-holder-status.dto';
import { BasicUserInfoDto } from './dto/basic-userinfo.dto';
import { DepositDto } from './dto/deposit.dto';
import { RefundDto } from './dto/refund.dto';
import { TransferResultDto } from './dto/transfer-result.dto';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { Transaction } from '../../payments/entities/transaction.entity';
import { MtnService } from '../mtn.service';
import { CreateDisbursementTransferDto } from './dto/create-disbursement-transfer.dto';
import { DisbursementTransferStatusDto } from './dto/disbursement-transfer-status.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DisbursementService {
  private readonly logger = new Logger(DisbursementService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly mtnService: MtnService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  // Get account balance for a tenant
  async getAccountBalance(tenantId: string, user: any): Promise<any> {
    // TODO: Use tenantId/user for multi-tenancy (e.g., audit, config lookup)
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');

    const url = `${mtnBase}/disbursement/v1_0/account/balance`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      // TODO: Audit log for balance check
      return response.data;
    } catch (error) {
      if (error.response) {
        this.logger.error('getAccountBalance error', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers,
          config: error.config,
        });
      } else {
        this.logger.error('getAccountBalance error', error);
      }
      throw new BadRequestException('Failed to get account balance');
    }
  }

   async createDisbursementToken(): Promise<string> {
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');

    const username = mtnDisbursement.x_reference_id;
    const apiKey = mtnDisbursement.api_key;
    const authString = `${username}:${apiKey}`;
    const url = `${mtnBase}/disbursement/token/`;
    try {
      const response = await axios.post(
        url,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
            'X-Target-Environment': mtnDisbursement.target_environment,
            Authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
          },
        },
      );
      return response?.data?.access_token;
    } catch (error) {
      this.logger.error('createDisbursementToken error', error);
      throw new BadRequestException('Failed to create disbursement token');
    }
  }

  // Transfer funds for a tenant
  async transfer(transferDto: CreateDisbursementTransferDto, tenantId: string, user: any): Promise<{ success: boolean; referenceId: string }> {
    // Validate DTO
    if (!transferDto.payee || !transferDto.amount || !transferDto.currency || !transferDto.referenceId) {
      throw new BadRequestException('Missing required transfer fields');
    }
    // TODO: Use tenantId/user for multi-tenancy (e.g., audit, config lookup)
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');
    const url = `${mtnBase}/disbursement/v1_0/transfer`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const referenceId = transferDto.referenceId;
      await axios.post(url, transferDto, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          'X-Reference-Id': referenceId,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      // TODO: Audit log for transfer
      return { success: true, referenceId };
    } catch (error) {
      this.logger.error('transfer error', error);
      throw new BadRequestException('Failed to transfer funds');
    }
  }

  // Get transfer status for a tenant
  async getTransferStatus(referenceId: string, tenantId: string, user: any): Promise<DisbursementTransferStatusDto> {
    // TODO: Use tenantId/user for multi-tenancy (e.g., audit, config lookup)
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');
    const url = `${mtnBase}/disbursement/v1_0/transfer/${referenceId}`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      // TODO: Audit log for status check
      // Map response to DTO
      const data = response.data;
      return {
        referenceId: data.referenceId || referenceId,
        status: data.status || data.statusCode || 'UNKNOWN',
        updatedAt: data.updatedAt || new Date().toISOString(),
        narration: data.narration || '',
      };
    } catch (error) {
      this.logger.error('getTransferStatus error', error);
      throw new BadRequestException('Failed to get transfer status');
    }
  }

   // Validate Account Holder Status
  async validateAccountHolderStatus(accountHolderIdType: string, accountHolderId: string, user: any): Promise<ValidateAccountHolderStatusDto> {
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');
    const url = `${mtnBase}/disbursement/v1_0/accountholder/${accountHolderIdType}/${accountHolderId}/active`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return { result: response.data.result || response.data }; // API returns {result: true/false}
    } catch (error) {
      this.logger.error('validateAccountHolderStatus error', error);
      throw new BadRequestException('Failed to validate account holder status');
    }
  }

  // Get Basic User Info
  async getBasicUserInfo(accountHolderIdType: string, accountHolderId: string, user: any): Promise<BasicUserInfoDto> {
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');
    const url = `${mtnBase}/disbursement/v1_0/accountholder/${accountHolderIdType}/${accountHolderId}/basicuserinfo`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error('getBasicUserInfo error', error);
      throw new BadRequestException('Failed to get basic user info');
    }
  }

  // Deposit V1
  async depositV1(depositDto: DepositDto, user: any): Promise<any> {
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');
    const url = `${mtnBase}/disbursement/v1_0/deposit`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const referenceId = depositDto.externalId;
      await axios.post(url, depositDto, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          'X-Reference-Id': referenceId,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return { success: true, referenceId };
    } catch (error) {
      this.logger.error('depositV1 error', error);
      throw new BadRequestException('Failed to deposit (v1)');
    }
  }

  // Deposit V2
  async depositV2(depositDto: DepositDto, user: any): Promise<any> {
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');
    const url = `${mtnBase}/disbursement/v2_0/deposit`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const referenceId = depositDto.externalId;
      await axios.post(url, depositDto, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          'X-Reference-Id': referenceId,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return { success: true, referenceId };
    } catch (error) {
      this.logger.error('depositV2 error', error);
      throw new BadRequestException('Failed to deposit (v2)');
    }
  }

  // Get Deposit Status
  async getDepositStatus(referenceId: string, user: any): Promise<TransferResultDto> {
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');
    const url = `${mtnBase}/disbursement/v1_0/deposit/${referenceId}`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error('getDepositStatus error', error);
      throw new BadRequestException('Failed to get deposit status');
    }
  }

  // Refund V1
  async refundV1(refundDto: RefundDto, user: any): Promise<any> {
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');
    const url = `${mtnBase}/disbursement/v1_0/refund`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const referenceId = refundDto.referenceIdToRefund;
      await axios.post(url, refundDto, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          'X-Reference-Id': referenceId,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return { success: true, referenceId };
    } catch (error) {
      this.logger.error('refundV1 error', error);
      throw new BadRequestException('Failed to refund (v1)');
    }
  }

  // Refund V2
  async refundV2(refundDto: RefundDto, user: any): Promise<any> {
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');
    const url = `${mtnBase}/disbursement/v2_0/refund`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const referenceId = refundDto.referenceIdToRefund;
      await axios.post(url, refundDto, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          'X-Reference-Id': referenceId,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return { success: true, referenceId };
    } catch (error) {
      this.logger.error('refundV2 error', error);
      throw new BadRequestException('Failed to refund (v2)');
    }
  }

  // Get Refund Status
  async getRefundStatus(referenceId: string, user: any): Promise<TransferResultDto> {
    const mtnBase = this.configService.get<string>('mtn.base');
    const mtnDisbursement = this.configService.get<any>('mtn.disbursement');
    const url = `${mtnBase}/disbursement/v1_0/refund/${referenceId}`;
    try {
      const bearerToken = await this.createDisbursementToken();
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
          'X-Target-Environment': mtnDisbursement.target_environment,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error('getRefundStatus error', error);
      throw new BadRequestException('Failed to get refund status');
    }
  }

  // Get Account Balance in Specific Currency
  async getAccountBalanceInCurrency(currency: string, user: any): Promise<any> {
    // This endpoint is not standard in MTN MoMo, so we filter the balance by currency if needed
    const balance = await this.getAccountBalance(user?.tenantId || '', user);
    if (balance && balance.availableBalance && balance.currency === currency) {
      return balance;
    }
    // If not found, return 0 for that currency
    return { availableBalance: '0', currency };
  }

  // OAuth2 Token
  async createOauth2Token(body: any, user: any): Promise<any> {
    // This is a placeholder; actual OAuth2 token logic may differ for MTN
    return this.createDisbursementToken();
  }

  // Get User Info With Consent
  async getUserInfoWithConsent(user: any): Promise<any> {
    // Not implemented in MTN MoMo API; return mock or error
    throw new BadRequestException('Not supported by MTN MoMo API');
  }

}