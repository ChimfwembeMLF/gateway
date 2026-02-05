import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

@Injectable()
export class AirtelAuthService {
  private readonly logger = new Logger(AirtelAuthService.name);
  private tokenCache: CachedToken | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Get OAuth2 bearer token for Airtel API
   * Implements token caching with automatic refresh
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      this.logger.debug('[AirtelAuth] Using cached token');
      return this.tokenCache.token;
    }

    // Fetch new token
    const airtelConfig = this.configService.get<any>('airtel');
    const clientId = this.configService.get<string>('airtel.client_id');
    const clientSecret = this.configService.get<string>('airtel.client_secret');

    if (!clientId || !clientSecret) {
      throw new Error('Airtel OAuth2 credentials not configured');
    }

    const tokenUrl = `${airtelConfig.base}/auth/oauth2/token`;

    try {
      this.logger.log('[AirtelAuth] Requesting new access token');

      const response = await axios.post<TokenResponse>(
        tokenUrl,
        {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
          },
        },
      );

      const { access_token, expires_in } = response.data;

      // Cache token with 5-minute buffer before expiry
      const expiresAt = Date.now() + (expires_in - 300) * 1000;
      this.tokenCache = {
        token: access_token,
        expiresAt,
      };

      this.logger.log('[AirtelAuth] Successfully obtained access token', {
        expiresIn: expires_in,
      });

      return access_token;
    } catch (error) {
      this.logger.error('[AirtelAuth] Failed to obtain access token', {
        error: error?.message,
        response: error?.response?.data,
      });
      throw new Error('Failed to authenticate with Airtel API');
    }
  }

  /**
   * Clear cached token (useful for testing or forced refresh)
   */
  clearTokenCache(): void {
    this.tokenCache = null;
    this.logger.debug('[AirtelAuth] Token cache cleared');
  }
}
