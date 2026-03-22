import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

import { ProviderToken } from '../../auth/entities/provider-token.entity';
import { PaymentProvider } from '../../../common/enums/provider.enum';

@Injectable()
export class ProviderTokenService {
  constructor(
    @InjectRepository(ProviderToken)
    private readonly providerTokenRepo: Repository<ProviderToken>,
    private readonly configService: ConfigService,
  ) {}

  async getToken(
    tenantId: string,
    provider: PaymentProvider = PaymentProvider.PAWAPAY,
  ): Promise<ProviderToken | null> {
    return this.providerTokenRepo.findOne({
      where: { tenantId, provider },
    });
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
      token = this.providerTokenRepo.create({
        tenantId,
        provider,
        accessToken,
        expiresAt,
        refreshToken,
      });
    } else {
      token.accessToken = accessToken;
      token.expiresAt = expiresAt;
      token.refreshToken = refreshToken;
    }

    return this.providerTokenRepo.save(token);
  }

  isTokenExpired(token: ProviderToken): boolean {
    if (!token.expiresAt) return false;
    return token.expiresAt.getTime() <= Date.now();
  }

  async ensureValidToken(
    tenantId: string,
    provider: PaymentProvider = PaymentProvider.PAWAPAY,
  ): Promise<ProviderToken> {
    let token = await this.getToken(tenantId, provider);

    if (!token || this.isTokenExpired(token)) {
      token =
        token?.refreshToken
          ? await this.refreshToken(token)
          : await this.acquireNewToken(tenantId, provider);
    }

    return token;
  }

  async acquireNewToken(
    tenantId: string,
    provider: PaymentProvider = PaymentProvider.PAWAPAY,
  ): Promise<ProviderToken> {
    if (provider !== PaymentProvider.PAWAPAY) {
      throw new InternalServerErrorException(
        `Unsupported provider: ${provider}`,
      );
    }

    const tokenUrl = this.configService.get<string>('pawapay.token_url');
    const apiKey = this.configService.get<string>('pawapay.api_key');

    if (!tokenUrl) {
      throw new InternalServerErrorException(
        'pawapay.token_url is not configured',
      );
    }

    if (!apiKey) {
      throw new InternalServerErrorException(
        'pawapay.api_key is not configured',
      );
    }

    const response = await axios.post(tokenUrl, {
      api_key: apiKey,
      grant_type: 'client_credentials',
    });

    const { access_token, expires_in, refresh_token } = response.data;
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : undefined;

    return this.saveToken(
      tenantId,
      provider,
      access_token,
      expiresAt,
      refresh_token,
    );
  }

  async refreshToken(token: ProviderToken): Promise<ProviderToken> {
    if (token.provider !== PaymentProvider.PAWAPAY || !token.refreshToken) {
      throw new InternalServerErrorException(
        'Refresh logic not implemented for this provider',
      );
    }

    const tokenUrl = this.configService.get<string>('pawapay.token_url');
    const apiKey = this.configService.get<string>('pawapay.api_key');

    if (!tokenUrl) {
      throw new InternalServerErrorException(
        'pawapay.token_url is not configured',
      );
    }

    if (!apiKey) {
      throw new InternalServerErrorException(
        'pawapay.api_key is not configured',
      );
    }

    const response = await axios.post(tokenUrl, {
      api_key: apiKey,
      refresh_token: token.refreshToken,
      grant_type: 'refresh_token',
    });

    const { access_token, expires_in, refresh_token } = response.data;
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : undefined;

    return this.saveToken(
      token.tenantId,
      token.provider,
      access_token,
      expiresAt,
      refresh_token,
    );
  }
}