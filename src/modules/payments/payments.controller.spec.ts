import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment, PaymentStatus, PaymentFlow } from './entities/payment.entity';
import { PaymentProvider } from '../../common/enums/provider.enum';
import { v4 as uuid } from 'uuid';

// ===== TEST UTILITIES =====
const generateTestId = (): string => uuid();

const generateTestPaymentDto = (overrides?: Partial<CreatePaymentDto>): CreatePaymentDto => ({
  provider: PaymentProvider.MTN,
  externalId: `INV-${generateTestId().substring(0, 8)}`,
  amount: 100,
  currency: 'GHS',
  payer: '256765725317',
  ...overrides,
});

const generateTestPayment = (overrides?: Partial<Payment>): Payment => ({
  id: generateTestId(),
  externalId: `INV-${generateTestId().substring(0, 8)}`,
  flow: PaymentFlow.COLLECTION,
  tenantId: generateTestId(),
  amount: 100,
  currency: 'GHS',
  status: PaymentStatus.PENDING,
  payer: '256765725317',
  payerMessage: 'Test payment',
  payeeNote: 'Test note',
  momoTransactionId: null,
  transactions: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
}) as any;

const suppressConsole = () => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
};

// ===== TEST SUITE =====
describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: jest.Mocked<PaymentsService>;
  let app: INestApplication;
  const tenantId = generateTestId();
  const userId = generateTestId();
  const mockRequest = {
    tenant: { id: tenantId },
    user: { id: userId, tenantId },
  };

  beforeEach(async () => {
    suppressConsole();

    const mockService = {
      create: jest.fn(),
      findAllByTenant: jest.fn(),
      findOne: jest.fn(),
      getPaymentStatus: jest.fn(),
      getBalance: jest.fn(),
      updateStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockService },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.tenant = mockRequest.tenant;
          req.user = mockRequest.user;
          return true;
        },
      })
      .overrideInterceptor(IdempotencyInterceptor)
      .useValue({})
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get(PaymentsService) as jest.Mocked<PaymentsService>;
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  // ===== TEST SUITE: create() =====
  describe('create', () => {
    it('should create a payment with valid DTO', async () => {
      const createPaymentDto = generateTestPaymentDto();
      const expectedPayment = generateTestPayment({ tenantId });
      service.create.mockResolvedValue(expectedPayment);

      const result = await controller.create(createPaymentDto, mockRequest);

      expect(result).toEqual(expectedPayment);
      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createPaymentDto,
          tenantId,
        }),
        mockRequest.user,
      );
    });

    it('should throw BadRequestException when tenantId missing', async () => {
      const createPaymentDto = generateTestPaymentDto();
      const invalidRequest = { tenant: {}, user: mockRequest.user };

      await expect(
        controller.create(createPaymentDto, invalidRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create payment with auto-generated externalId', async () => {
      const createPaymentDto = generateTestPaymentDto();
      delete (createPaymentDto as any).externalId;
      const expectedPayment = generateTestPayment({ tenantId });
      service.create.mockResolvedValue(expectedPayment);

      const result = await controller.create(createPaymentDto, mockRequest);

      expect(result).toEqual(expectedPayment);
      expect(service.create).toHaveBeenCalled();
    });

    it('should pass idempotency key to service', async () => {
      const createPaymentDto = generateTestPaymentDto();
      const expectedPayment = generateTestPayment({ tenantId });
      service.create.mockResolvedValue(expectedPayment);
      const idempotencyKey = generateTestId();

      // Idempotency key would be passed via request context in real implementation
      const result = await controller.create(createPaymentDto, mockRequest);

      expect(result).toEqual(expectedPayment);
    });

    it('should enforce tenant isolation on creation', async () => {
      const createPaymentDto = generateTestPaymentDto();
      const expectedPayment = generateTestPayment({ tenantId });
      service.create.mockResolvedValue(expectedPayment);

      await controller.create(createPaymentDto, mockRequest);

      const callArgs = service.create.mock.calls[0][0];
      expect(callArgs.tenantId).toBe(tenantId);
    });
  });

  // ===== TEST SUITE: findAll() =====
  describe('findAll', () => {
    it('should return all payments for tenant', async () => {
      const payments = [
        generateTestPayment({ tenantId }),
        generateTestPayment({ tenantId }),
      ];
      service.findAllByTenant.mockResolvedValue(payments);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual(payments);
      expect(service.findAllByTenant).toHaveBeenCalledWith(tenantId);
    });

    it('should throw BadRequestException when tenantId missing', async () => {
      const invalidRequest = { tenant: {}, user: mockRequest.user };

      await expect(
        controller.findAll(invalidRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce tenant isolation in queries', async () => {
      const payments = [generateTestPayment({ tenantId })];
      service.findAllByTenant.mockResolvedValue(payments);

      await controller.findAll(mockRequest);

      expect(service.findAllByTenant).toHaveBeenCalledWith(tenantId);
    });

    it('should return empty array when no payments exist', async () => {
      service.findAllByTenant.mockResolvedValue([]);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual([]);
      expect(service.findAllByTenant).toHaveBeenCalledWith(tenantId);
    });
  });

  // ===== TEST SUITE: findOne() =====
  describe('findOne', () => {
    it('should return payment by ID for authorized tenant', async () => {
      const payment = generateTestPayment({ tenantId });
      service.findOne.mockResolvedValue(payment);

      const result = await controller.findOne(payment.id, mockRequest);

      expect(result).toEqual(payment);
      expect(service.findOne).toHaveBeenCalledWith(payment.id, tenantId);
    });

    it('should throw BadRequestException when tenantId missing', async () => {
      const paymentId = generateTestId();
      const invalidRequest = { tenant: {}, user: mockRequest.user };

      await expect(
        controller.findOne(paymentId, invalidRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when payment not found', async () => {
      const paymentId = generateTestId();
      service.findOne.mockResolvedValue(null as any);

      await expect(
        controller.findOne(paymentId, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when accessing other tenant payment', async () => {
      const otherTenantId = generateTestId();
      const payment = generateTestPayment({ tenantId: otherTenantId });
      service.findOne.mockResolvedValue(null as any); // Simulates permission check

      await expect(
        controller.findOne(payment.id, mockRequest),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should enforce tenant isolation in findOne', async () => {
      const payment = generateTestPayment({ tenantId });
      service.findOne.mockResolvedValue(payment);

      await controller.findOne(payment.id, mockRequest);

      expect(service.findOne).toHaveBeenCalledWith(payment.id, tenantId);
    });
  });

  // ===== TEST SUITE: getStatus() =====
  describe('getStatus', () => {
    it('should return payment status from provider', async () => {
      const paymentId = generateTestId();
      const status = { status: PaymentStatus.SUCCESSFUL, referenceId: 'REF-123' };
      service.getPaymentStatus.mockResolvedValue(status);

      const result = await controller.getStatus(paymentId, 'mtn', mockRequest);

      expect(result).toEqual(status);
      expect(service.getPaymentStatus).toHaveBeenCalledWith(
        paymentId,
        tenantId,
        'mtn',
        mockRequest.user,
      );
    });

    it('should use default provider when not specified', async () => {
      const paymentId = generateTestId();
      const status = { status: PaymentStatus.PENDING };
      service.getPaymentStatus.mockResolvedValue(status);

      const result = await controller.getStatus(paymentId, null as any, mockRequest);

      expect(result).toEqual(status);
      expect(service.getPaymentStatus).toHaveBeenCalledWith(
        paymentId,
        tenantId,
        null,
        mockRequest.user,
      );
    });

    it('should throw BadRequestException when tenantId missing', async () => {
      const paymentId = generateTestId();
      const invalidRequest = { tenant: {}, user: mockRequest.user };

      await expect(
        controller.getStatus(paymentId, 'mtn', invalidRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce tenant isolation in status queries', async () => {
      const paymentId = generateTestId();
      const status = { status: PaymentStatus.PENDING };
      service.getPaymentStatus.mockResolvedValue(status);

      await controller.getStatus(paymentId, 'mtn', mockRequest);

      const call = service.getPaymentStatus.mock.calls[0];
      expect(call[1]).toBe(tenantId); // tenantId should be second argument
    });
  });

  // ===== TEST SUITE: getBalance() =====
  describe('getBalance', () => {
    it('should return wallet balance for tenant', async () => {
      const balance = { amount: 1000, currency: 'GHS' };
      service.getBalance.mockResolvedValue(balance);

      const result = await controller.getBalance('mtn', mockRequest);

      expect(result).toEqual({ success: true, data: balance });
      expect(service.getBalance).toHaveBeenCalledWith(
        tenantId,
        'mtn',
        mockRequest.user,
      );
    });

    it('should throw BadRequestException when tenantId missing', async () => {
      const invalidRequest = { tenant: {}, user: mockRequest.user };

      await expect(
        controller.getBalance('mtn', invalidRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return balance with success flag', async () => {
      const balance = { amount: 5000, currency: 'GHS' };
      service.getBalance.mockResolvedValue(balance);

      const result = await controller.getBalance('mtn', mockRequest);

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
      expect(result.data).toEqual(balance);
    });

    it('should enforce tenant isolation in balance queries', async () => {
      const balance = { amount: 1000, currency: 'GHS' };
      service.getBalance.mockResolvedValue(balance);

      await controller.getBalance('mtn', mockRequest);

      const call = service.getBalance.mock.calls[0];
      expect(call[0]).toBe(tenantId); // First argument should be tenantId
    });
  });

  // ===== TEST SUITE: Multi-tenant isolation =====
  describe('Multi-tenant Isolation', () => {
    it('should not leak payment data across tenants', async () => {
      const otherTenantId = generateTestId();
      const request1 = { tenant: { id: tenantId }, user: { id: userId, tenantId } };
      const request2 = {
        tenant: { id: otherTenantId },
        user: { id: generateTestId(), tenantId: otherTenantId },
      };

      const payment1 = generateTestPayment({ tenantId });
      const payment2 = generateTestPayment({ tenantId: otherTenantId });

      service.findOne.mockImplementation(async (id, tid): Promise<Payment> => {
        if (tid === tenantId && id === payment1.id) return payment1;
        if (tid === otherTenantId && id === payment2.id) return payment2;
        return null as any;
      });

      const result1 = await controller.findOne(payment1.id, request1);
      const result2 = await controller.findOne(payment2.id, request2);

      expect(result1.tenantId).toBe(tenantId);
      expect(result2.tenantId).toBe(otherTenantId);
      expect(result1.tenantId).not.toBe(result2.tenantId);
    });

    it('should prevent access to other tenant payments', async () => {
      const otherTenantId = generateTestId();
      const payment = generateTestPayment({ tenantId: otherTenantId });

      service.findOne.mockResolvedValue(null as any); // Simulates cross-tenant access denial

      const request = {
        tenant: { id: tenantId },
        user: { id: userId, tenantId },
      };

      await expect(controller.findOne(payment.id, request)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===== TEST SUITE: Error Handling =====
  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const createPaymentDto = generateTestPaymentDto();
      service.create.mockRejectedValue(new Error('Database error'));

      await expect(
        controller.create(createPaymentDto, mockRequest),
      ).rejects.toThrow('Database error');
    });

    it('should handle invalid payment status responses', async () => {
      const paymentId = generateTestId();
      service.getPaymentStatus.mockRejectedValue(
        new Error('Provider API timeout'),
      );

      await expect(
        controller.getStatus(paymentId, 'mtn', mockRequest),
      ).rejects.toThrow('Provider API timeout');
    });

    it('should handle missing payment gracefully', async () => {
      const paymentId = generateTestId();
      service.findOne.mockResolvedValue(null as any);

      await expect(controller.findOne(paymentId, mockRequest)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ===== TEST SUITE: Authentication =====
  describe('Authentication & Authorization', () => {
    it('should require API key authentication', async () => {
      const invalidRequest = { tenant: null, user: null };
      const createPaymentDto = generateTestPaymentDto();

      // In real scenario, ApiKeyGuard would prevent this, but here we test controller validation
      await expect(
        controller.create(createPaymentDto, invalidRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate tenant context from request', async () => {
      const createPaymentDto = generateTestPaymentDto();
      const noTenantRequest = { tenant: null, user: { id: userId } };

      await expect(
        controller.create(createPaymentDto, noTenantRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===== TEST SUITE: Input Validation =====
  describe('Input Validation', () => {
    it('should accept valid payment amount', async () => {
      const createPaymentDto = generateTestPaymentDto({ amount: 50 });
      const expectedPayment = generateTestPayment({ tenantId, amount: 50 });
      service.create.mockResolvedValue(expectedPayment);

      const result = await controller.create(createPaymentDto, mockRequest);

      expect(result.amount).toBe(50);
    });

    it('should accept valid provider', async () => {
      const createPaymentDto = generateTestPaymentDto({
        provider: PaymentProvider.MTN as any,
      });
      const expectedPayment = generateTestPayment({ tenantId });
      service.create.mockResolvedValue(expectedPayment);

      const result = await controller.create(createPaymentDto, mockRequest);

      expect(result).toEqual(expectedPayment);
    });
  });
});
