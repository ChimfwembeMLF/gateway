import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AirtelDisbursementService } from './airtel-disbursement.service';
import { AirtelAuthService } from '../auth/airtel-auth.service';
import { AirtelSigningService } from '../signing/airtel-signing.service';
import { AxiosResponse } from 'axios';

describe('AirtelDisbursementService', () => {
  let service: AirtelDisbursementService;
  let authService: AirtelAuthService;
  let signingService: AirtelSigningService;
  let httpService: HttpService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AirtelDisbursementService,
        {
          provide: AirtelAuthService,
          useValue: {
            getAccessToken: jest.fn(),
          },
        },
        {
          provide: AirtelSigningService,
          useValue: {
            generateSignature: jest.fn(),
            generateEncryptedKey: jest.fn(),
            encryptPin: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              const config: any = {
                'airtel.disbursement.baseUrl': 'https://api.airtel.com',
                'airtel.clientId': 'test-client',
                'airtel.clientSecret': 'test-secret',
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AirtelDisbursementService>(AirtelDisbursementService);
    authService = module.get<AirtelAuthService>(AirtelAuthService);
    signingService = module.get<AirtelSigningService>(AirtelSigningService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDisbursement', () => {
    const validRequest = {
      reference: 'REF-001',
      subscriber: {
        country: 'ZM',
        msisdn: '0977123456',
        currency: 'ZMW',
      },
      transaction: {
        id: 'TXN-001',
        amount: 500,
        country: 'ZM',
        currency: 'ZMW',
        type: 'B2C',
      },
      pin: 'encrypted_pin_data_here',
      wallet_type: 'NORMAL',
    };

    it('should successfully create a disbursement', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          status: {
            success: true,
            message: 'Disbursement successful',
            response_code: 'DP00800001006',
          },
          data: {
            transaction: {
              id: 'AIRTEL-TXN-12345',
              status: 'SUCCESS',
            },
          },
        },
      };

      jest.spyOn(authService, 'getAccessToken').mockResolvedValue('test-token');
      jest
        .spyOn(signingService, 'generateSignature')
        .mockReturnValue('test-signature');
      jest
        .spyOn(signingService, 'generateEncryptedKey')
        .mockReturnValue('test-encrypted-key');
      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.createDisbursement(validRequest);

      expect(result).toEqual(mockResponse.data);
      expect(authService.getAccessToken).toHaveBeenCalled();
      expect(signingService.generateSignature).toHaveBeenCalledWith(validRequest);
      expect(signingService.generateEncryptedKey).toHaveBeenCalled();
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.airtel.com/standard/v3/disbursements',
        validRequest,
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'x-signature': 'test-signature',
            'x-key': 'test-encrypted-key',
          }),
        }),
      );
    });

    it('should reject request with missing reference', async () => {
      const invalidRequest = { ...validRequest, reference: undefined };

      await expect(service.createDisbursement(invalidRequest as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject request with missing subscriber', async () => {
      const invalidRequest = { ...validRequest, subscriber: undefined };

      await expect(service.createDisbursement(invalidRequest as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject request with missing MSISDN', async () => {
      const invalidRequest = {
        ...validRequest,
        subscriber: { country: 'ZM' },
      };

      await expect(service.createDisbursement(invalidRequest as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject request with zero or negative amount', async () => {
      const invalidRequest = {
        ...validRequest,
        transaction: { ...validRequest.transaction, amount: 0 },
      };

      await expect(service.createDisbursement(invalidRequest as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject request with missing transaction ID', async () => {
      const invalidRequest = {
        ...validRequest,
        transaction: { ...validRequest.transaction, id: undefined },
      };

      await expect(service.createDisbursement(invalidRequest as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle authentication failure', async () => {
      jest.spyOn(authService, 'getAccessToken').mockResolvedValue('' as any);

      await expect(service.createDisbursement(validRequest)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle API error responses', async () => {
      const errorResponse: AxiosResponse = {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
        data: {
          status: {
            success: false,
            message: 'Invalid MSISDN',
            response_code: 'DP00800001001',
          },
        },
      };

      jest.spyOn(authService, 'getAccessToken').mockResolvedValue('test-token');
      jest
        .spyOn(signingService, 'generateSignature')
        .mockReturnValue('test-signature');
      jest
        .spyOn(signingService, 'generateEncryptedKey')
        .mockReturnValue('test-encrypted-key');
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => ({ response: errorResponse })));

      await expect(service.createDisbursement(validRequest)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle network timeout', async () => {
      jest.spyOn(authService, 'getAccessToken').mockResolvedValue('test-token');
      jest
        .spyOn(signingService, 'generateSignature')
        .mockReturnValue('test-signature');
      jest
        .spyOn(signingService, 'generateEncryptedKey')
        .mockReturnValue('test-encrypted-key');
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(
          throwError(() => ({
            request: {},
            message: 'Network timeout',
          })),
        );

      await expect(service.createDisbursement(validRequest)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should include idempotency key in transaction ID', async () => {
      const requestWithIdempotency = {
        ...validRequest,
        transaction: {
          ...validRequest.transaction,
          id: 'unique-idempotency-key-001',
        },
      };

      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          status: { success: true },
          data: { transaction: { id: 'AIRTEL-TXN-99999' } },
        },
      };

      jest.spyOn(authService, 'getAccessToken').mockResolvedValue('test-token');
      jest
        .spyOn(signingService, 'generateSignature')
        .mockReturnValue('test-signature');
      jest
        .spyOn(signingService, 'generateEncryptedKey')
        .mockReturnValue('test-encrypted-key');
      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.createDisbursement(requestWithIdempotency);

      expect(result).toEqual(mockResponse.data);
      // Verify the idempotency key was included in the request
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          transaction: expect.objectContaining({
            id: 'unique-idempotency-key-001',
          }),
        }),
        expect.any(Object),
      );
    });
  });

  describe('queryDisbursementStatus', () => {
    it('should query disbursement status successfully', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          status: {
            success: true,
            message: 'SUCCESS',
          },
          data: {
            transaction: {
              status: 'SUCCESS',
            },
          },
        },
      };

      jest.spyOn(authService, 'getAccessToken').mockResolvedValue('test-token');
      jest.spyOn(httpService, 'get').mockReturnValue(of(mockResponse));

      const result = await service.queryDisbursementStatus('TXN-001');

      expect(result).toEqual(mockResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.airtel.com/standard/v3/disbursements/TXN-001',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        }),
      );
    });

    it('should handle status query errors', async () => {
      jest.spyOn(authService, 'getAccessToken').mockResolvedValue('test-token');
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(
          throwError(() => ({
            response: {
              status: 404,
              data: { status: { message: 'Transaction not found' } },
            },
          })),
        );

      await expect(service.queryDisbursementStatus('INVALID-TXN')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('refundDisbursement', () => {
    const refundRequest = {
      reference: 'REFUND-001',
      original_transaction_id: 'AIRTEL-TXN-12345',
    };

    it('should request refund successfully', async () => {
      const mockResponse: AxiosResponse = {
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as any,
        data: {
          status: {
            success: true,
            message: 'Refund initiated',
          },
        },
      };

      jest.spyOn(authService, 'getAccessToken').mockResolvedValue('test-token');
      jest
        .spyOn(signingService, 'generateSignature')
        .mockReturnValue('test-signature');
      jest
        .spyOn(signingService, 'generateEncryptedKey')
        .mockReturnValue('test-encrypted-key');
      jest.spyOn(httpService, 'post').mockReturnValue(of(mockResponse));

      const result = await service.refundDisbursement(refundRequest);

      expect(result).toEqual(mockResponse.data);
      expect(httpService.post).toHaveBeenCalledWith(
        'https://api.airtel.com/standard/v3/disbursements/refund',
        refundRequest,
        expect.any(Object),
      );
    });
  });
});
