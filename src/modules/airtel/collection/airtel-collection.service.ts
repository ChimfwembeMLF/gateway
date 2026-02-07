import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AirtelRequestToPayDto, AirtelRequestToPayResponse } from '../dto/airtel-payment.dto';
import { AirtelAuthService } from '../auth/airtel-auth.service';
import { AirtelSigningService } from '../signing/airtel-signing.service';

@Injectable()
export class AirtelCollectionService {
  private readonly logger = new Logger(AirtelCollectionService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AirtelAuthService,
    private readonly signingService: AirtelSigningService,
  ) {}

  async requestToPay(dto: AirtelRequestToPayDto): Promise<{ transactionId: string; status?: string } > {
    const airtelConfig = this.configService.get<any>('airtel');
    const collectionConfig = this.configService.get<any>('airtel.collection');

    if (!airtelConfig?.base) {
      throw new BadRequestException('Airtel configuration is missing');
    }

    // Validate msisdn does not contain country code (as per Airtel docs)
    if (dto.subscriber.msisdn.startsWith('+') || dto.subscriber.msisdn.length > 10) {
      throw new BadRequestException('MSISDN should not include country code');
    }

    // Get OAuth2 access token
    const accessToken = await this.authService.getAccessToken();

    // Generate message signature and encrypted key
    const signature = this.signingService.generateSignature(dto);
    const encryptedKey = this.signingService.generateEncryptedKey();

    const url = `${airtelConfig.base}/merchant/v2/payments/`;
    const headers = {
      Accept: '*/*',
      'Content-Type': 'application/json',
      'X-Country': collectionConfig.country,
      'X-Currency': collectionConfig.currency,
      Authorization: `Bearer ${accessToken}`,
      'x-signature': signature,
      'x-key': encryptedKey,
    };

    this.logger.log('[AirtelCollection] requestToPay request', {
      url,
      transactionId: dto.transaction.id,
      amount: dto.transaction.amount,
      msisdn: dto.subscriber.msisdn,
    });

    try {
      const response = await axios.post<AirtelRequestToPayResponse>(url, dto, { headers });
      
      const { data, status } = response.data;
      
      if (!status?.success) {
        this.logger.error('[AirtelCollection] requestToPay failed', {
          code: status?.code,
          message: status?.message,
          response_code: status?.response_code,
        });
        throw new BadRequestException(`Airtel payment failed: ${status?.message}`);
      }

      this.logger.log('[AirtelCollection] requestToPay success', {
        transactionId: dto.transaction.id,
        status: data?.transaction?.status,
        response_code: status?.response_code,
      });

      return { 
        transactionId: dto.transaction.id, 
        status: data?.transaction?.status 
      };
    } catch (error) {
      this.logger.error('[AirtelCollection] requestToPay error', {
        error: error?.message,
        response: error?.response?.data,
      });
      throw new BadRequestException(error?.message || 'Airtel requestToPay failed');
    }
  }

  /**
   * Query transaction status from Airtel
   */
  async queryTransactionStatus(transactionId: string): Promise<any> {
    const airtelConfig = this.configService.get<any>('airtel');
    const collectionConfig = this.configService.get<any>('airtel.collection');

    const accessToken = await this.authService.getAccessToken();
    
    const url = `${airtelConfig.base}/standard/v1/payments/${transactionId}`;
    const headers = {
      Accept: '*/*',
      'Content-Type': 'application/json',
      'X-Country': collectionConfig.country,
      'X-Currency': collectionConfig.currency,
      Authorization: `Bearer ${accessToken}`,
    };

    try {
      const response = await axios.get(url, { headers });
      
      this.logger.log('[AirtelCollection] queryTransactionStatus success', {
        transactionId,
        status: response.data?.data?.transaction?.status,
      });

      return response.data;
    } catch (error) {
      this.logger.error('[AirtelCollection] queryTransactionStatus error', {
        transactionId,
        error: error?.message,
        response: error?.response?.data,
      });
      throw new BadRequestException('Failed to query transaction status');
    }
  }

  /**
   * Refund a completed transaction
   */
  async refundTransaction(refundDto: any): Promise<any> {
    const airtelConfig = this.configService.get<any>('airtel');
    const collectionConfig = this.configService.get<any>('airtel.collection');

    const accessToken = await this.authService.getAccessToken();
    const signature = this.signingService.generateSignature(refundDto);
    const encryptedKey = this.signingService.generateEncryptedKey();

    const url = `${airtelConfig.base}/standard/v1/payments/refund`;
    const headers = {
      Accept: '*/*',
      'Content-Type': 'application/json',
      'X-Country': collectionConfig.country,
      'X-Currency': collectionConfig.currency,
      Authorization: `Bearer ${accessToken}`,
      'x-signature': signature,
      'x-key': encryptedKey,
    };

    try {
      const response = await axios.post(url, refundDto, { headers });
      
      const { data, status } = response.data;
      
      if (!status?.success) {
        this.logger.error('[AirtelCollection] refundTransaction failed', {
          code: status?.code,
          message: status?.message,
        });
        throw new BadRequestException(`Airtel refund failed: ${status?.message}`);
      }

      this.logger.log('[AirtelCollection] refundTransaction success', {
        refundId: refundDto.transaction.id,
        status: data?.transaction?.status,
      });

      return response.data;
    } catch (error) {
      this.logger.error('[AirtelCollection] refundTransaction error', {
        error: error?.message,
        response: error?.response?.data,
      });
      throw new BadRequestException('Airtel refund failed');
    }
  }
}
