import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';

import { CollectionService } from './collection.service';
import { Payment } from '../../payments/entities/payment.entity';
import { Transaction } from '../../payments/entities/transaction.entity';
import { MtnService } from '../mtn.service';
import { generateTestId, suppressConsole } from 'test/unit/test.utils';

jest.mock('axios');

describe('CollectionService', () => {
  let service: CollectionService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockMtnService: jest.Mocked<MtnService>;
  let mockPaymentRepository: jest.Mocked<Repository<Payment>>;
  let mockTransactionRepository: jest.Mocked<Repository<Transaction>>;

  suppressConsole();

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn(),
    } as any;

    mockMtnService = {
      createMtnToken: jest.fn(),
    } as any;

    mockPaymentRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    mockTransactionRepository = {
      save: jest.fn(),
      find: jest.fn(),
    } as any;

    // Mock axios.post to return success by default
    (axios.post as jest.Mock).mockResolvedValue({ status: 200, data: {} });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MtnService,
          useValue: mockMtnService,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
      ],
    }).compile();

    service = module.get<CollectionService>(CollectionService);
  });

  describe('requestToPay', () => {
    it('should successfully initiate a request to pay', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const userId = generateTestId();
      const externalId = generateTestId();
      const dto = {
        externalId,
        amount: '100',
        currency: 'EUR',
        payer: {
          partyIdType: 'MSISDN',
          partyId: '256778110305',
        },
        payerMessage: 'test payment',
        payeeNote: 'test note',
      };

      const user = { id: userId, role: 'SUPER_ADMIN' };

      // Mock configService.get to handle 'mtn' and 'mtn.collection' calls
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'mtn') {
          return {
            base: 'https://sandbox.momodeveloper.mtn.com',
            collection: {
              subscription_key: 'test-key',
              target_environment: 'sandbox',
            },
          };
        }
        if (key === 'mtn.collection') {
          return {
            subscription_key: 'test-key',
            target_environment: 'sandbox',
          };
        }
        return {};
      });

      mockMtnService.createMtnToken.mockResolvedValue('test-token');
      mockPaymentRepository.findOne.mockResolvedValue({
        id: generateTestId(),
        externalId,
        tenantId,
      } as any);

      // ACT
      const result = await service.requestToPay(
        dto as any,
        tenantId,
        user,
        externalId,
      );

      // ASSERT
      expect(mockMtnService.createMtnToken).toHaveBeenCalled();
      expect(mockPaymentRepository.findOne).toHaveBeenCalled();
    });
  });

  describe('getRequestToPayStatus', () => {
    it('should return status for a request to pay transaction', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const userId = generateTestId();
      const transactionId = generateTestId();
      const user = { id: userId };

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'mtn') {
          return {
            base: 'https://sandbox.momodeveloper.mtn.com',
            collection: {
              subscription_key: 'test-key',
              target_environment: 'sandbox',
            },
          };
        }
        if (key === 'mtn.collection') {
          return {
            subscription_key: 'test-key',
            target_environment: 'sandbox',
          };
        }
        return {};
      });

      mockMtnService.createMtnToken.mockResolvedValue('test-token');
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: { status: 'SUCCESSFUL' },
      });
      mockPaymentRepository.findOne.mockResolvedValue({
        id: generateTestId(),
        momoTransactionId: transactionId,
        tenantId,
        status: 'PENDING',
      } as any);

      // ACT
      await service.getRequestToPayStatus(transactionId, tenantId, user);

      // ASSERT
      expect(mockMtnService.createMtnToken).toHaveBeenCalled();
      expect(axios.get).toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('should process webhook notification successfully', async () => {
      // ARRANGE
      const webhook = {
        transactionId: generateTestId(),
        status: 'SUCCESSFUL',
        externalId: generateTestId(),
      };

      mockPaymentRepository.findOne.mockResolvedValue({
        id: generateTestId(),
        externalId: webhook.externalId,
        tenantId: generateTestId(),
        status: 'PENDING',
      } as any);

      mockPaymentRepository.save.mockResolvedValue({} as any);
      mockTransactionRepository.save.mockResolvedValue({} as any);

      // ACT
      const result = await service.handleWebhook(webhook as any);

      // ASSERT
      expect(result).toBeUndefined();
      expect(mockPaymentRepository.findOne).toHaveBeenCalled();
      expect(mockPaymentRepository.save).toHaveBeenCalled();
    });

    it('should handle webhook for successful payment', async () => {
      // ARRANGE
      const webhook = {
        transactionId: generateTestId(),
        status: 'SUCCESSFUL',
        externalId: generateTestId(),
      };

      mockPaymentRepository.findOne.mockResolvedValue({
        id: generateTestId(),
        externalId: webhook.externalId,
        status: 'PENDING',
      } as any);

      // ACT
      await service.handleWebhook(webhook as any);

      // ASSERT
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            externalId: webhook.externalId,
          }),
        }),
      );
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should enforce tenant isolation in requestToPay', async () => {
      // ARRANGE
      const tenantA = generateTestId();
      const tenantB = generateTestId();
      const userId = generateTestId();
      const externalId = generateTestId();

      const dto = {
        externalId,
        amount: '100',
        currency: 'EUR',
        payer: { partyIdType: 'MSISDN', partyId: '256778110305' },
      };

      const user = { id: userId };

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'mtn') {
          return {
            base: 'https://sandbox.momodeveloper.mtn.com',
            collection: {
              subscription_key: 'test-key',
              target_environment: 'sandbox',
            },
          };
        }
        if (key === 'mtn.collection') {
          return {
            subscription_key: 'test-key',
            target_environment: 'sandbox',
          };
        }
        return {};
      });

      mockMtnService.createMtnToken.mockResolvedValue('test-token');
      mockPaymentRepository.findOne.mockResolvedValue(null);

      // ACT
      await service.requestToPay(dto as any, tenantA, user, externalId);

      // ASSERT - Verify tenantId is included in database query
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: tenantA,
          }),
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle MTN API errors gracefully', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const userId = generateTestId();
      const transactionId = generateTestId();
      const user = { id: userId };

      mockMtnService.createMtnToken.mockRejectedValue(new Error('Token Error'));

      // ACT & ASSERT
      await expect(
        service.getRequestToPayStatus(transactionId, tenantId, user),
      ).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      // ARRANGE
      const webhook = {
        transactionId: generateTestId(),
        status: 'SUCCESSFUL',
        externalId: generateTestId(),
      };

      mockPaymentRepository.findOne.mockRejectedValue(new Error('DB Error'));

      // ACT & ASSERT
      await expect(service.handleWebhook(webhook as any)).rejects.toThrow();
    });
  });
});
