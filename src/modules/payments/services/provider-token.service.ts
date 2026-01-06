import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderToken } from '../../auth/entities/provider-token.entity';
import { PaymentProvider } from '../../../common/enums/provider.enum';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ProviderTokenService {
  constructor(
    @InjectRepository(ProviderToken)
    private readonly providerTokenRepo: Repository<ProviderToken>,
    private readonly configService: ConfigService,
  ) {}

  async getToken(tenantId: string, provider: PaymentProvider): Promise<ProviderToken | null> {
    return this.providerTokenRepo.findOne({ where: { tenantId, provider } });
  }

  async saveToken(
    tenantId: string,
    provider: PaymentProvider,
    accessToken: string,
    expiresAt?: Date,
    refreshToken?: string,
  ): Promise<ProviderToken> {
    let token = await this.getToken(tenantId, provider);
    if (!token) {
      token = this.providerTokenRepo.create({ tenantId, provider, accessToken, expiresAt, refreshToken });
    } else {
      token.accessToken = accessToken;
      token.expiresAt = expiresAt;
      token.refreshToken = refreshToken;
    }
    return this.providerTokenRepo.save(token);
  }

  async isTokenExpired(token: ProviderToken): Promise<boolean> {
    if (!token.expiresAt) return false;
    return token.expiresAt.getTime() < Date.now();
  }

  async ensureValidToken(tenantId: string, provider: PaymentProvider): Promise<ProviderToken> {
    let token = await this.getToken(tenantId, provider);
    if (!token || await this.isTokenExpired(token)) {
      if (token && token.refreshToken) {
        token = await this.refreshToken(token);
      } else {
        token = await this.acquireNewToken(tenantId, provider);
      }
    }
    return token;
  }

  async acquireNewToken(tenantId: string, provider: PaymentProvider): Promise<ProviderToken> {
    // Example for MTN, adapt for other providers
    if (provider === PaymentProvider.MTN) {
      const tokenUrl = this.configService.get<string>('mtn.token_url');
      if (!tokenUrl) {
        throw new Error('MTN token_url is not configured');
      }
      const subscriptionKey = this.configService.get<string>('mtn.subscription_key');
      if (!subscriptionKey) {
        throw new Error('MTN subscription_key is not configured');
      }
      const apiKey = this.configService.get<string>('mtn.api_key');
      if (!apiKey) {
        throw new Error('MTN api_key is not configured');
      }
      // Only use config values for authentication
      const response = await axios.post(tokenUrl, {
        subscription_key: subscriptionKey,
        api_key: apiKey,
        grant_type: 'client_credentials',
      });
      const { access_token, expires_in, refresh_token } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);
      return this.saveToken(tenantId, provider, access_token, expiresAt, refresh_token);
    }
    // Add logic for other providers here
    throw new Error(`Token acquisition not implemented for provider: ${provider}`);
  }

  async refreshToken(token: ProviderToken): Promise<ProviderToken> {
    // Example for MTN, adapt for other providers
    if (token.provider === PaymentProvider.MTN && token.refreshToken) {
      const tokenUrl = this.configService.get<string>('mtn.token_url');
      if (!tokenUrl) {
        throw new Error('MTN token_url is not configured');
      }
      const subscriptionKey = this.configService.get<string>('mtn.subscription_key');
      if (!subscriptionKey) {
        throw new Error('MTN subscription_key is not configured');
      }
      const apiKey = this.configService.get<string>('mtn.api_key');
      if (!apiKey) {
        throw new Error('MTN api_key is not configured');
      }
      // Only use config values for authentication
      const response = await axios.post(tokenUrl, {
        subscription_key: subscriptionKey,
        api_key: apiKey,
        refresh_token: token.refreshToken,
        grant_type: 'refresh_token',
      });
      const { access_token, expires_in, refresh_token } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);
      return this.saveToken(token.tenantId, token.provider, access_token, expiresAt, refresh_token);
    }
    // Add logic for other providers here
    throw new Error('Refresh logic not implemented for this provider');
  }
}
