import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AirtelCollectionService } from './airtel-collection.service';
import { AirtelAuthService } from '../auth/airtel-auth.service';
import { AirtelSigningService } from '../signing/airtel-signing.service';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AirtelCollectionService', () => {
  let service: AirtelCollectionService;
  let authService: AirtelAuthService;
  let signingService: AirtelSigningService;
  let configService: ConfigService;

  const mockConfig = {
    airtel: {
      base: 'https://openapiuat.airtel.co.zm',
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      signing_secret: 'test-signing-secret',
      collection: {
        country: 'ZM',
        currency: 'ZMW',
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AirtelCollectionService,
        AirtelAuthService,
        AirtelSigningService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'airtel') return mockConfig.airtel;
              if (key === 'airtel.collection') return mockConfig.airtel.collection;
              if (key === 'airtel.client_id') return mockConfig.airtel.client_id;
              if (key === 'airtel.client_secret') return mockConfig.airtel.client_secret;
              if (key === 'airtel.signing_secret') return mockConfig.airtel.signing_secret;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AirtelCollectionService>(AirtelCollectionService);
    authService = module.get<AirtelAuthService>(AirtelAuthService);
    signingService = module.get<AirtelSigningService>(AirtelSigningService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('requestToPay', () => {
    it('should successfully request payment', async () => {
      const mockAccessToken = 'test-bearer-token';
      const mockSignature = 'test-signature';
      const mockEncryptedKey = 'test-encrypted-key';

      jest.spyOn(authService, 'getAccessToken').mockResolvedValue(mockAccessToken);
      jest.spyOn(signingService, 'generateSignature').mockReturnValue(mockSignature);
      jest.spyOn(signingService, 'generateEncryptedKey').mockReturnValue(mockEncryptedKey);

      mockedAxios.post.mockResolvedValue({
        data: {
          data: {
            transaction: {
              id: false,
              status: 'SUCCESS',
            },
          },
          status: {
            code: '200',
            message: 'SUCCESS',
            response_code: 'DP00800001006',
            success: true,
          },
        },
      });

      const dto = {
        reference: 'Testing transaction',
        subscriber: {
          country: 'ZM',
          currency: 'ZMW',
          msisdn: '12345789',
        },
        transaction: {
          amount: 1000,
          country: 'ZM',
          currency: 'ZMW',
          id: 'random-unique-id',
        },
      };

      const result = await service.requestToPay(dto);

      expect(result).toEqual({
        transactionId: 'random-unique-id',
        status: 'SUCCESS',
      });

      expect(authService.getAccessToken).toHaveBeenCalled();
      expect(signingService.generateSignature).toHaveBeenCalledWith(dto);
      expect(signingService.generateEncryptedKey).toHaveBeenCalled();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://openapiuat.airtel.co.zm/merchant/v2/payments/',
        dto,
        {
          headers: {
            Accept: '*/*',
            'Content-Type': 'application/json',
            'X-Country': 'ZM',
            'X-Currency': 'ZMW',
            Authorization: `Bearer ${mockAccessToken}`,
            'x-signature': mockSignature,
            'x-key': mockEncryptedKey,
          },
        },
      );
    });

    it('should reject msisdn with country code', async () => {
      const dto = {
        reference: 'Testing transaction',
        subscriber: {
          country: 'ZM',
          msisdn: '+260123456789',  // Has country code
        },
        transaction: {
          amount: 1000,
          id: 'test-id',
        },
      };

      await expect(service.requestToPay(dto)).rejects.toThrow(
        'MSISDN should not include country code',
      );
    });

    it('should handle API errors', async () => {
      jest.spyOn(authService, 'getAccessToken').mockResolvedValue('token');
      jest.spyOn(signingService, 'generateSignature').mockReturnValue('sig');
      jest.spyOn(signingService, 'generateEncryptedKey').mockReturnValue('key');

      mockedAxios.post.mockResolvedValue({
        data: {
          status: {
            success: false,
            message: 'Insufficient balance',
            code: '400',
          },
        },
      });

      const dto = {
        reference: 'Test',
        subscriber: { country: 'ZM', msisdn: '123456' },
        transaction: { amount: 1000, id: 'test-id' },
      };

      await expect(service.requestToPay(dto)).rejects.toThrow(
        'Airtel payment failed: Insufficient balance',
      );
    });
  });

  describe('queryTransactionStatus', () => {
    it('should query transaction status successfully', async () => {
      const mockAccessToken = 'test-bearer-token';
      jest.spyOn(authService, 'getAccessToken').mockResolvedValue(mockAccessToken);

      mockedAxios.get.mockResolvedValue({
        data: {
          data: {
            transaction: {
              id: 'test-transaction-id',
              status: 'SUCCESS',
              amount: 1000,
            },
          },
          status: {
            success: true,
            code: '200',
          },
        },
      });

      const result = await service.queryTransactionStatus('test-transaction-id');

      expect(result.data.transaction.status).toBe('SUCCESS');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://openapiuat.airtel.co.zm/standard/v1/payments/test-transaction-id',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        }),
      );
    });
  });

  describe('refundTransaction', () => {
    it('should refund transaction successfully', async () => {
      const mockAccessToken = 'test-bearer-token';
      const mockSignature = 'test-signature';
      const mockEncryptedKey = 'test-encrypted-key';

      jest.spyOn(authService, 'getAccessToken').mockResolvedValue(mockAccessToken);
      jest.spyOn(signingService, 'generateSignature').mockReturnValue(mockSignature);
      jest.spyOn(signingService, 'generateEncryptedKey').mockReturnValue(mockEncryptedKey);

      mockedAxios.post.mockResolvedValue({
        data: {
          data: {
            transaction: {
              status: 'SUCCESS',
              id: 'refund-id',
            },
          },
          status: {
            success: true,
            code: '200',
            message: 'Refund successful',
          },
        },
      });

      const refundDto = {
        reference: 'Refund request',
        transaction: {
          airtel_money_id: 'original-transaction-id',
          id: 'refund-unique-id',
        },
      };

      const result = await service.refundTransaction(refundDto);

      expect(result.data.transaction.status).toBe('SUCCESS');
      expect(authService.getAccessToken).toHaveBeenCalled();
      expect(signingService.generateSignature).toHaveBeenCalledWith(refundDto);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://openapiuat.airtel.co.zm/standard/v1/payments/refund',
        refundDto,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
            'x-signature': mockSignature,
            'x-key': mockEncryptedKey,
          }),
        }),
      );
    });
  });
});
