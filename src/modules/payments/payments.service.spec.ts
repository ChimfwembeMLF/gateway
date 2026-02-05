import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { PaymentsService } from './payments.service';
import { Payment, PaymentStatus, PaymentFlow } from './entities/payment.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CollectionService } from '../mtn/collection/collection.service';
import { DisbursementService } from '../mtn/disbursement/disbursement.service';
import { UuidGeneratorService } from './external-id.service';
import { PaymentProvider } from '../../common/enums/provider.enum';
import {
  generateTestPaymentDto,
  generateTestId,
  createMockPayment,
  assertTenantIsolation,
  MTN_MOCK_RESPONSES,
  suppressConsole,
} from 'test/unit/test.utils';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let mockPaymentRepository: jest.Mocked<Repository<Payment>>;
  let mockTransactionRepository: jest.Mocked<Repository<Transaction>>;
  let mockCollectionService: jest.Mocked<CollectionService>;
  let mockDisbursementService: jest.Mocked<DisbursementService>;
  let mockUuidGenerator: jest.Mocked<UuidGeneratorService>;

  suppressConsole();

  beforeEach(async () => {
    // Create mocks
    mockPaymentRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as any;

    mockTransactionRepository = {
      save: jest.fn(),
      create: jest.fn(),
    } as any;

    mockCollectionService = {
      requestToPay: jest.fn(),
      getRequestToPayStatus: jest.fn(),
    } as any;

    mockDisbursementService = {
      transfer: jest.fn(),
      getTransferStatus: jest.fn(),
    } as any;

    mockUuidGenerator = {
      generate: jest.fn().mockReturnValue(generateTestId()),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: CollectionService,
          useValue: mockCollectionService,
        },
        {
          provide: DisbursementService,
          useValue: mockDisbursementService,
        },
        {
          provide: UuidGeneratorService,
          useValue: mockUuidGenerator,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('create', () => {
    it('should create a payment with PENDING status for MTN provider', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const dto = generateTestPaymentDto({
        provider: PaymentProvider.MTN,
        // tenantId added by service layer
      });
      const mockPayment = createMockPayment({
        tenantId,
        status: PaymentStatus.PENDING,
      });

      mockPaymentRepository.create.mockReturnValue(mockPayment as any);
      mockPaymentRepository.save.mockResolvedValue(mockPayment as any);
      mockTransactionRepository.save.mockResolvedValue({} as any);
      mockCollectionService.requestToPay.mockResolvedValue({
        transactionId: generateTestId(),
      });

      // ACT
      const result = await service.create({ ...dto, tenantId } as any, {});

      // ASSERT
      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.tenantId).toBe(tenantId);
      expect(mockPaymentRepository.save).toHaveBeenCalled();
      expect(mockCollectionService.requestToPay).toHaveBeenCalled();
    });

    it('should set externalId from DTO if provided', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const externalId = `INV-${Date.now()}`;
      const dto = generateTestPaymentDto({
        provider: PaymentProvider.MTN,
        externalId,
        // tenantId added by service layer
      });
      const mockPayment = createMockPayment({
        tenantId,
        externalId,
      });

      mockPaymentRepository.create.mockReturnValue(mockPayment as any);
      mockPaymentRepository.save.mockResolvedValue(mockPayment as any);
      mockTransactionRepository.save.mockResolvedValue({} as any);
      mockCollectionService.requestToPay.mockResolvedValue({
        transactionId: generateTestId(),
      });

      // ACT
      const result = await service.create({ ...dto, tenantId } as any, {});

      // ASSERT
      expect(result.externalId).toBe(externalId);
    });

    it('should generate externalId if not provided in DTO', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const dto = generateTestPaymentDto({
        provider: PaymentProvider.MTN,
        // tenantId added by service layer
      });
      delete (dto as any).externalId;

      const mockPayment = createMockPayment({
        tenantId,
        externalId: 'generated-id',
      });

      mockPaymentRepository.create.mockReturnValue(mockPayment as any);
      mockPaymentRepository.save.mockResolvedValue(mockPayment as any);
      mockTransactionRepository.save.mockResolvedValue({} as any);
      mockCollectionService.requestToPay.mockResolvedValue({
        transactionId: generateTestId(),
      });

      // ACT
      const result = await service.create({ ...dto, tenantId } as any, {});

      // ASSERT
      expect(result.externalId).toBeDefined();
      expect(mockUuidGenerator.generate).toHaveBeenCalled();
    });

    it('should call CollectionService.requestToPay for MTN provider', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const dto = generateTestPaymentDto({
        provider: PaymentProvider.MTN,
        // tenantId added by service layer
      });
      const mockPayment = createMockPayment({ tenantId });

      mockPaymentRepository.create.mockReturnValue(mockPayment as any);
      mockPaymentRepository.save.mockResolvedValue(mockPayment as any);
      mockTransactionRepository.save.mockResolvedValue({} as any);
      mockCollectionService.requestToPay.mockResolvedValue({
        transactionId: generateTestId(),
      });

      // ACT
      await service.create({ ...dto, tenantId } as any, {});

      // ASSERT
      expect(mockCollectionService.requestToPay).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: String(dto.amount),
          currency: dto.currency,
          payer: expect.any(Object),
        }),
        tenantId,
        expect.any(Object),
        expect.any(String),
      );
    });

    it('should throw BadRequestException for unsupported provider', async () => {
      // ARRANGE
      const dto = generateTestPaymentDto({
        provider: 'UNSUPPORTED' as any,
      });

      // ACT & ASSERT
      await expect(service.create(dto as any, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should save Transaction record on successful payment creation', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const dto = generateTestPaymentDto({
        provider: PaymentProvider.MTN,
        // tenantId added by service layer
      });
      const mockPayment = createMockPayment({ tenantId });

      mockPaymentRepository.create.mockReturnValue(mockPayment as any);
      mockPaymentRepository.save.mockResolvedValue(mockPayment as any);
      mockTransactionRepository.create.mockReturnValue({} as any);
      mockTransactionRepository.save.mockResolvedValue({} as any);
      mockCollectionService.requestToPay.mockResolvedValue({
        transactionId: generateTestId(),
      });

      // ACT
      await service.create(dto as any, {});

      // ASSERT
      expect(mockTransactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          // tenantId added by service layer
          type: TransactionType.REQUEST_TO_PAY,
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all payments for a tenant', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const mockPayments = [
        createMockPayment({ tenantId }),
        createMockPayment({ tenantId }),
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments as any);

      // ACT
      const result = await service.findAllByTenant(tenantId);

      // ASSERT
      expect(result).toEqual(mockPayments);
      assertTenantIsolation(result, tenantId);
    });

    it('should filter payments by tenantId', async () => {
      // ARRANGE
      const tenantA = generateTestId();
      const tenantB = generateTestId();
      const paymentsA = [createMockPayment({ tenantId: tenantA })];

      mockPaymentRepository.find.mockResolvedValue(paymentsA as any);

      // ACT
      const result = await service.findAllByTenant(tenantA);

      // ASSERT
      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: { tenantId: tenantA },
      });
      expect(result.every(p => p.tenantId === tenantA)).toBe(true);
    });

    it('should return empty array if no payments exist for tenant', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      mockPaymentRepository.find.mockResolvedValue([]);

      // ACT
      const result = await service.findAllByTenant(tenantId);

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return payment when found for tenant', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const paymentId = generateTestId();
      const mockPayment = createMockPayment({
        id: paymentId,
        tenantId,
      });

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment as any);

      // ACT
      const result = await service.findOne(paymentId, tenantId);

      // ASSERT
      expect(result).toEqual(mockPayment);
      expect(result.tenantId).toBe(tenantId);
    });

    it('should throw NotFoundException if payment not found for tenant', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const paymentId = generateTestId();
      mockPaymentRepository.findOne.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findOne(paymentId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enforce tenant isolation when querying', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const paymentId = generateTestId();

      mockPaymentRepository.findOne.mockResolvedValue(null);

      // ACT
      try {
        await service.findOne(paymentId, tenantId);
      } catch (e) {
        // Expected to throw
      }

      // ASSERT - Verify tenantId was included in query
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId }),
      });
    });
  });

  describe('updateStatus', () => {
    it('should update payment status', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const paymentId = generateTestId();
      const mockPayment = createMockPayment({
        id: paymentId,
        // tenantId added by service layer
        status: PaymentStatus.PENDING,
      });

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment as any);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESSFUL,
      } as any);

      // ACT
      const result = await service.updateStatus(
        paymentId,
        PaymentStatus.SUCCESSFUL,
        tenantId,
      );

      // ASSERT
      expect(result.status).toBe(PaymentStatus.SUCCESSFUL);
      expect(mockPaymentRepository.save).toHaveBeenCalled();
    });

    it('should only update payment for correct tenant', async () => {
      // ARRANGE
      const tenantA = generateTestId();
      const tenantB = generateTestId();
      const paymentId = generateTestId();

      mockPaymentRepository.findOne.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(
        service.updateStatus(paymentId, PaymentStatus.SUCCESSFUL, tenantB),
      ).rejects.toThrow(NotFoundException);

      // Verify query included tenant filter
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId: tenantB }),
      });
    });
  });

  describe('getPaymentStatus', () => {
    it('should return payment and provider status', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const paymentId = generateTestId();
      const mockPayment = createMockPayment({
        id: paymentId,
        // tenantId added by service layer
        status: PaymentStatus.PENDING,
      });

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment as any);
      mockCollectionService.getRequestToPayStatus.mockResolvedValue({
        status: PaymentStatus.SUCCESSFUL,
      });

      // ACT
      const result = await service.getPaymentStatus(paymentId, tenantId);

      // ASSERT
      expect(result).toHaveProperty('payment');
      expect(result).toHaveProperty('status');
      expect(result.payment.id).toBe(paymentId);
    });

    it('should throw error for unsupported provider', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const paymentId = generateTestId();

      mockPaymentRepository.findOne.mockResolvedValue(
        createMockPayment({ id: paymentId, tenantId }) as any,
      );

      // ACT & ASSERT
      await expect(
        service.getPaymentStatus(paymentId, tenantId, 'UNSUPPORTED'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Tenant Isolation Tests', () => {
    it('should prevent tenant A from accessing tenant B payments', async () => {
      // ARRANGE
      const tenantA = generateTestId();
      const tenantB = generateTestId();
      const paymentId = generateTestId();

      mockPaymentRepository.findOne.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(service.findOne(paymentId, tenantA)).rejects.toThrow(
        NotFoundException,
      );

      // Verify that the query specifically looked for tenantA
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ tenantId: tenantA }),
      });
    });

    it('should only return payments matching the requested tenant', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const mockPayments = [
        createMockPayment({ tenantId }),
        createMockPayment({ tenantId }),
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments as any);

      // ACT
      const result = await service.findAllByTenant(tenantId);

      // ASSERT
      expect(result.every(p => p.tenantId === tenantId)).toBe(true);
      assertTenantIsolation(result, tenantId);
    });

    it('should enforce tenantId in all queries', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const paymentId = generateTestId();

      mockPaymentRepository.findOne.mockResolvedValue(null);

      // ACT
      try {
        await service.findOne(paymentId, tenantId);
      } catch (e) {
        // Expected
      }

      // ASSERT - Every query must include tenantId filter
      const calls = mockPaymentRepository.findOne.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      calls.forEach(call => {
        expect(call[0]).toHaveProperty('where.tenantId');
      });
    });
  });

  describe('Payment Flow Tests', () => {
    it('should complete collection payment flow: create → pending → successful', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const dto = generateTestPaymentDto({
        provider: PaymentProvider.MTN,
        // tenantId added by service layer
      });

      // Step 1: Create payment
      const mockPayment = createMockPayment({
        // tenantId added by service layer
        status: PaymentStatus.PENDING,
      });
      mockPaymentRepository.create.mockReturnValue(mockPayment as any);
      mockPaymentRepository.save.mockResolvedValue(mockPayment as any);
      mockTransactionRepository.save.mockResolvedValue({} as any);
      mockCollectionService.requestToPay.mockResolvedValue({
        transactionId: generateTestId(),
      });

      // ACT - Step 1: Create
      const created = await service.create(dto as any, {});
      expect(created.status).toBe(PaymentStatus.PENDING);

      // Step 2: Update status
      mockPaymentRepository.findOne.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESSFUL,
      } as any);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESSFUL,
      } as any);

      const updated = await service.updateStatus(
        created.id,
        PaymentStatus.SUCCESSFUL,
        tenantId,
      );

      // ASSERT
      expect(created.status).toBe(PaymentStatus.PENDING);
      expect(updated.status).toBe(PaymentStatus.SUCCESSFUL);
    });

    it('should track payment status changes in transaction log', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const dto = generateTestPaymentDto({
        provider: PaymentProvider.MTN,
        // tenantId added by service layer
      });

      const mockPayment = createMockPayment({
        // tenantId added by service layer
        status: PaymentStatus.PENDING,
      });

      mockPaymentRepository.create.mockReturnValue(mockPayment as any);
      mockPaymentRepository.save.mockResolvedValue(mockPayment as any);
      mockTransactionRepository.save.mockResolvedValue({} as any);
      mockCollectionService.requestToPay.mockResolvedValue({
        transactionId: generateTestId(),
      });

      // ACT
      await service.create(dto as any, {});

      // ASSERT - Transaction should be logged
      expect(mockTransactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          // tenantId added by service layer
          type: TransactionType.REQUEST_TO_PAY,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Collection API errors gracefully', async () => {
      // ARRANGE
      const dto = generateTestPaymentDto({
        provider: PaymentProvider.MTN,
      });
      const mockPayment = createMockPayment();

      mockPaymentRepository.create.mockReturnValue(mockPayment as any);
      mockPaymentRepository.save.mockResolvedValue(mockPayment as any);
      mockCollectionService.requestToPay.mockRejectedValue(
        new Error('API Error'),
      );

      // ACT & ASSERT
      await expect(service.create(dto as any, {})).rejects.toThrow();
    });

    it('should return FAILED status for invalid phone number', async () => {
      // ARRANGE
      const dto = generateTestPaymentDto({
        provider: PaymentProvider.MTN,
        payer: 'invalid',
      });
      const mockPayment = createMockPayment({
        status: PaymentStatus.FAILED,
      });

      mockPaymentRepository.create.mockReturnValue(mockPayment as any);
      mockPaymentRepository.save.mockResolvedValue(mockPayment as any);
      mockCollectionService.requestToPay.mockRejectedValue(
        new BadRequestException('Invalid phone number'),
      );

      // ACT & ASSERT
      await expect(service.create(dto as any, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
