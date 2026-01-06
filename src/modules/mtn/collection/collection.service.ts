import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { RequestToPayDto } from '../dto/mtn.dto';
import { MtnService } from '../mtn.service';

@Injectable()
export class CollectionService {
  private readonly logger = new Logger(CollectionService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly mtnService: MtnService,
  ) {}

  async requestToPay(dto: RequestToPayDto, tenantId: string): Promise<any> {
    const mtn = this.configService.get<any>('mtn');
    const url = `${mtn.base}/collection/v1_0/requesttopay`;
    try {
      const bearerToken = await this.mtnService.createMtnToken();
      const transactionId = dto.externalId;
      await axios.post(url, dto, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtn.subscription_key,
          'X-Target-Environment': mtn.target_environment,
          'X-Reference-Id': transactionId,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return { success: true, transactionId };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error('requestToPay error', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
          config: error.config,
        });
      } else {
        this.logger.error('requestToPay error', error);
      }
      throw new BadRequestException('Failed to request to pay');
    }
  }

  async getRequestToPayStatus(transactionId: string, tenantId: string): Promise<any> {
    const mtn = this.configService.get<any>('mtn');
    const url = `${mtn.base}/collection/v1_0/requesttopay/${transactionId}`;
    try {
      const bearerToken = await this.mtnService.createMtnToken();
      const response = await axios.get(url, {
        headers: {
          'Ocp-Apim-Subscription-Key': mtn.subscription_key,
          'X-Target-Environment': mtn.target_environment,
          Authorization: `Bearer ${bearerToken}`,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error('getRequestToPayStatus error', (error as AxiosError).message);
      throw new BadRequestException('Failed to get request to pay status');
    }
  }
}
