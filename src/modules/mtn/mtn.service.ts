import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import axios, { AxiosError } from 'axios';
import { firstValueFrom, catchError } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MtnService {
  private readonly logger = new Logger(MtnService.name);

  constructor(
    private readonly mtnHttpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createApiUser(tenantId: string): Promise<{ success: boolean; referenceId: string }> {
    // Optionally use tenantId for tenant-specific config or logging
    const mtn = this.configService.get<any>('mtn');
    const mtnCollection = this.configService.get<any>('mtn.collection');
    const subscriptionKey = mtnCollection.subscription_key;
    const referenceId = this.generateReferenceId();
    const url = `${mtn.base}/v1_0/apiuser`;
    try {
      await axios.post(
        url,
        { providerCallbackHost: 'https://webhook.site/placeholder' },
        {
          headers: {
            'X-Reference-Id': referenceId,
            'Ocp-Apim-Subscription-Key': subscriptionKey,
          },
        },
      );
      return { success: true, referenceId };
    } catch (error) {
      this.logger.error('createApiUser error', (error as AxiosError).message);
      throw new BadRequestException('Failed to create API user');
    }
  }

  async createApiKey(referenceId: string, tenantId: string): Promise<{ apiKey: string }> {
    // Optionally use tenantId for tenant-specific config or logging
    const mtn = this.configService.get<any>('mtn');
    const mtnCollection = this.configService.get<any>('mtn.collection');
    const subscriptionKey = mtnCollection.subscription_key;
    const url = `${mtn.base}/v1_0/apiuser/${referenceId}/apikey`;
    try {
      const response = await axios.post(url, null, {
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
        },
      });
      return { apiKey: response.data.apiKey };
    } catch (error) {
      this.logger.error('createApiKey error', (error as AxiosError).message);
      throw new BadRequestException('Failed to create API key');
    }
  }

  async createBearerToken(referenceId: string, apiKey: string, tenantId: string): Promise<string> {
    // Optionally use tenantId for tenant-specific config or logging
    const mtn = this.configService.get<any>('mtn');
    const mtnCollection = this.configService.get<any>('mtn.collection');
    const subscriptionKey = mtnCollection.subscription_key;
    const targetEnvironment = mtnCollection.target_environment;
    const url = `${mtn.base}/collection/token/`;
    const auth = Buffer.from(`${referenceId}:${apiKey}`).toString('base64');
    try {
      const response = await axios.post(url, null, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'X-Target-Environment': targetEnvironment,
        },
      });
      return response.data.access_token;
    } catch (error) {
      this.logger.error('createBearerToken error', (error as AxiosError).message);
      throw new BadRequestException('Failed to get bearer token');
    }
  }




  async fetchUserBasicDetails(mobileNumber: string, tenantId: string): Promise<any> {
    try {
      // Optionally use tenantId for tenant-specific config or logging
      const mtn = this.configService.get<any>('mtn');
    const mtnCollection = this.configService.get<any>('mtn.collection');
      const paddedMomoNumber = mobileNumber.startsWith('26') ? mobileNumber : `26${mobileNumber.slice(1)}`;
  const token = await this.createMtnToken();
      const url = `${mtn.base}/v1_0/accountholder/MSISDN/${paddedMomoNumber}/basicuserinfo`;
      const response = await axios.get(url, {
        headers: {
          'X-Reference-Id': mtn.x_reference_id,
          'Ocp-Apim-Subscription-Key': mtn.subscription_key,
          'X-Target-Environment': mtn.target_environment,
          Authorization: `Bearer ${token}`,
        },
      });
      this.logger.debug('fetchUserBasicDetails response');
      return response.data;
    } catch (error) {
      this.logger.error('fetchUserBasicDetails error', (error as AxiosError).message);
      throw new BadRequestException((error as AxiosError).message || 'Failed to fetch user details');
    }
  }

  async getMtnUserInfo(phone: string): Promise<any> {
    try {
      const link = this.configService.get<string>('olympus.link') ?? '';
      if (!link) {
        this.logger.error('OlympusTech link not configured');
        throw new InternalServerErrorException('OlympusTech link not configured');
      }
      const url = `${link}PhoneNumber=${encodeURIComponent(phone)}`;
      const response = await axios.get(url);
      return response.data as any;
    } catch (error) {
      this.logger.error('getMtnUserInfo error', (error as AxiosError).message);
      throw new InternalServerErrorException((error as AxiosError).message || 'Failed to fetch MTN user info');
    }
  }

  async createMtnToken(): Promise<string> {
    try {
      const mtnBase = this.configService.get<string>('mtn.base');
      const mtnCollection = this.configService.get<any>('mtn.collection');
      const username = mtnCollection.x_reference_id;
      const apiKey = mtnCollection.api_key;
      const authString = `${username}:${apiKey}`;
      const url = `${mtnBase}/collection/token/`;

      const response = await axios.post(
        url,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': mtnCollection.subscription_key,
            'X-Target-Environment': mtnCollection.target_environment,
            Authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
          },
        },
      );
      this.logger.debug('createMtnToken response', response?.data);
      return response?.data?.access_token;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error('createMtnToken error', {
        message: axiosError.message,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers,
      });
      throw new BadRequestException(axiosError.message || 'Failed to create MTN token');
    }
  }

  private generateReferenceId(): string {
    // Use a simple UUID fallback using crypto if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { randomUUID } = require('crypto');
      return randomUUID();
    } catch {
      return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
  }
}
