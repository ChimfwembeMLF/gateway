import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AirtelAuthService } from './airtel-auth.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AirtelAuthService', () => {
  let service: AirtelAuthService;
  let configService: ConfigService;

  const mockConfig = {
    airtel: {
      base: 'https://openapiuat.airtel.co.zm',
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AirtelAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'airtel') return mockConfig.airtel;
              if (key === 'airtel.client_id') return mockConfig.airtel.client_id;
              if (key === 'airtel.client_secret') return mockConfig.airtel.client_secret;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AirtelAuthService>(AirtelAuthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('getAccessToken', () => {
    it('should fetch and cache new access token', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'new-bearer-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      const token = await service.getAccessToken();

      expect(token).toBe('new-bearer-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://openapiuat.airtel.co.zm/auth/oauth2/token',
        {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          grant_type: 'client_credentials',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: '*/*',
          },
        },
      );
    });

    it('should return cached token if still valid', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'cached-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      // First call - fetches and caches
      const token1 = await service.getAccessToken();
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Second call - uses cache
      const token2 = await service.getAccessToken();
      expect(token2).toBe(token1);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1); // Still only 1 call
    });

    it('should fetch new token after cache expires', async () => {
      jest.useFakeTimers();

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            access_token: 'first-token',
            token_type: 'Bearer',
            expires_in: 10, // 10 seconds
          },
        })
        .mockResolvedValueOnce({
          data: {
            access_token: 'second-token',
            token_type: 'Bearer',
            expires_in: 3600,
          },
        });

      // First call
      const token1 = await service.getAccessToken();
      expect(token1).toBe('first-token');

      // Advance time past expiry (10s + 5min buffer = past cache)
      jest.advanceTimersByTime(11000);

      // Second call - should fetch new token
      const token2 = await service.getAccessToken();
      expect(token2).toBe('second-token');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('should throw error if credentials are missing', async () => {
      const badModule: TestingModule = await Test.createTestingModule({
        providers: [
          AirtelAuthService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => null),
            },
          },
        ],
      }).compile();

      const badService = badModule.get<AirtelAuthService>(AirtelAuthService);

      await expect(badService.getAccessToken()).rejects.toThrow(
        'Airtel OAuth2 credentials not configured',
      );
    });

    it('should handle authentication failures', async () => {
      mockedAxios.post.mockRejectedValue({
        message: 'Invalid credentials',
        response: {
          data: { error: 'invalid_client' },
        },
      });

      await expect(service.getAccessToken()).rejects.toThrow(
        'Failed to authenticate with Airtel API',
      );
    });
  });

  describe('clearTokenCache', () => {
    it('should clear the token cache', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });

      // Get token to populate cache
      await service.getAccessToken();
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearTokenCache();

      // Next call should fetch new token
      await service.getAccessToken();
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });
});
