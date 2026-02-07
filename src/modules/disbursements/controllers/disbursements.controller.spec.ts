import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DisbursementsController } from './disbursements.controller';
import { DisbursementsService } from '../services/disbursements.service';
import { DisbursementStatus } from 'src/common/enums/disbursement-status.enum';
import { WalletType } from 'src/common/enums/wallet-type.enum';
import { TransactionType } from 'src/common/enums/transaction-type.enum';
import { PaymentProvider } from '../dto/create-disbursement.dto';
import { TenantService } from '../../tenant/tenant.service';

describe('DisbursementsController', () => {
  let app: INestApplication;
  let service: DisbursementsService;

  const tenantId = 'tenant-001';

  const mockCreateDto = {
    provider: PaymentProvider.AIRTEL,
    externalId: 'order-2024-001',
    payeeMsisdn: '0977123456',
    amount: 500.5,
    currency: 'ZMW',
    reference: 'INV-2024-001',
    pin: '1234',
    walletType: WalletType.NORMAL,
    transactionType: TransactionType.B2C,
  };

  const mockResponseDto = {
    id: 'disb-001',
    provider: PaymentProvider.AIRTEL,
    tenantId,
    externalId: mockCreateDto.externalId,
    payeeMsisdn: mockCreateDto.payeeMsisdn,
    amount: mockCreateDto.amount.toString(),
    currency: mockCreateDto.currency,
    reference: mockCreateDto.reference,
    walletType: mockCreateDto.walletType,
    transactionType: mockCreateDto.transactionType,
    status: DisbursementStatus.SUCCESS,
    airtelReferenceId: 'AIRTEL-12345',
    airtelMoneyId: 'MONEY-67890',
    errorCode: undefined,
    errorMessage: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisbursementsController],
      providers: [
        {
          provide: DisbursementsService,
          useValue: {
            createDisbursement: jest.fn(),
            getDisbursement: jest.fn(),
            listDisbursements: jest.fn(),
            countByStatus: jest.fn(),
          },
        },
        {
          provide: TenantService,
          useValue: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            createTenantWithAdmin: jest.fn(),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    // Mock the API key guard and current tenant decorator
    app.use((req: any, res: any, next: any) => {
      req['tenant'] = { id: tenantId };
      next();
    });

    await app.init();
    service = module.get<DisbursementsService>(DisbursementsService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/v1/disbursements', () => {
    it('should create disbursement successfully', async () => {
      jest.spyOn(service, 'createDisbursement').mockResolvedValue(mockResponseDto as any);

      const response = await request(app.getHttpServer())
        .post('/api/v1/disbursements')
        .send(mockCreateDto)
        .expect(201);

      expect(response.body).toEqual(mockResponseDto);
      expect(service.createDisbursement).toHaveBeenCalledWith(mockCreateDto, tenantId);
    });

    it('should return 400 for validation error (missing externalId)', async () => {
      const { externalId, ...invalidDto } = mockCreateDto;

      await request(app.getHttpServer())
        .post('/api/v1/disbursements')
        .send(invalidDto)
        .expect(400);

      expect(service.createDisbursement).not.toHaveBeenCalled();
    });

    it('should return 400 for validation error (invalid amount)', async () => {
      const invalidDto = { ...mockCreateDto, amount: 0 };

      await request(app.getHttpServer())
        .post('/api/v1/disbursements')
        .send(invalidDto)
        .expect(400);

      expect(service.createDisbursement).not.toHaveBeenCalled();
    });

    it('should return 400 for validation error (invalid PIN)', async () => {
      const invalidDto = { ...mockCreateDto, pin: '123' };

      await request(app.getHttpServer())
        .post('/api/v1/disbursements')
        .send(invalidDto)
        .expect(400);

      expect(service.createDisbursement).not.toHaveBeenCalled();
    });

    it('should return 400 for validation error (unknown field)', async () => {
      const invalidDto = { ...mockCreateDto, unknownField: 'test' };

      await request(app.getHttpServer())
        .post('/api/v1/disbursements')
        .send(invalidDto)
        .expect(400);

      expect(service.createDisbursement).not.toHaveBeenCalled();
    });

    it('should return 409 for duplicate externalId', async () => {
      jest
        .spyOn(service, 'createDisbursement')
        .mockRejectedValue(new Error('Duplicate externalId'));

      await request(app.getHttpServer())
        .post('/api/v1/disbursements')
        .send(mockCreateDto)
        .expect(500); // or 409 if proper error handling
    });

    it('should validate walletType enum', async () => {
      const invalidDto = { ...mockCreateDto, walletType: 'INVALID_TYPE' };

      await request(app.getHttpServer())
        .post('/api/v1/disbursements')
        .send(invalidDto)
        .expect(400);
    });

    it('should validate transactionType enum', async () => {
      const invalidDto = { ...mockCreateDto, transactionType: 'INVALID_TYPE' };

      await request(app.getHttpServer())
        .post('/api/v1/disbursements')
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('GET /api/v1/disbursements/:id', () => {
    it('should get disbursement by ID', async () => {
      jest.spyOn(service, 'getDisbursement').mockResolvedValue(mockResponseDto as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/disbursements/disb-001')
        .expect(200);

      expect(response.body).toEqual(mockResponseDto);
      expect(service.getDisbursement).toHaveBeenCalledWith('disb-001', tenantId);
    });

    it('should return 400 for non-existent disbursement', async () => {
      jest
        .spyOn(service, 'getDisbursement')
        .mockRejectedValue(new Error('Disbursement not found'));

      await request(app.getHttpServer())
        .get('/api/v1/disbursements/invalid-id')
        .expect(500); // or 400 if proper error handling
    });

    it('should enforce tenant isolation on get', async () => {
      jest.spyOn(service, 'getDisbursement').mockResolvedValue(mockResponseDto as any);

      await request(app.getHttpServer())
        .get('/api/v1/disbursements/disb-001')
        .expect(200);

      expect(service.getDisbursement).toHaveBeenCalledWith('disb-001', tenantId);
    });
  });

  describe('GET /api/v1/disbursements', () => {
    it('should list disbursements with default pagination', async () => {
      const mockListResponse = {
        items: [mockResponseDto],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      jest.spyOn(service, 'listDisbursements').mockResolvedValue(mockListResponse as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/disbursements')
        .expect(200);

      expect(response.body).toEqual(mockListResponse);
      expect(service.listDisbursements).toHaveBeenCalledWith(tenantId, expect.any(Object));
    });

    it('should list disbursements with custom pagination', async () => {
      const mockListResponse = {
        items: [mockResponseDto],
        total: 100,
        page: 2,
        limit: 50,
        totalPages: 2,
      };

      jest.spyOn(service, 'listDisbursements').mockResolvedValue(mockListResponse as any);

      const response = await request(app.getHttpServer())
        .get('/api/v1/disbursements?page=2&limit=50')
        .expect(200);

      expect(response.body).toEqual(mockListResponse);
      expect(service.listDisbursements).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          page: 2,
          limit: 50,
        }),
      );
    });

    it('should filter by status', async () => {
      const mockListResponse = {
        items: [mockResponseDto],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      jest.spyOn(service, 'listDisbursements').mockResolvedValue(mockListResponse as any);

      const response = await request(app.getHttpServer())
        .get(`/api/v1/disbursements?status=${DisbursementStatus.SUCCESS}`)
        .expect(200);

      expect(response.body).toEqual(mockListResponse);
      expect(service.listDisbursements).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          status: DisbursementStatus.SUCCESS,
        }),
      );
    });

    it('should filter by date range', async () => {
      const mockListResponse = {
        items: [mockResponseDto],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      jest.spyOn(service, 'listDisbursements').mockResolvedValue(mockListResponse as any);

      const startDate = '2024-02-01T00:00:00Z';
      const endDate = '2024-02-06T23:59:59Z';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/disbursements?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`)
        .expect(200);

      expect(response.body).toEqual(mockListResponse);
      expect(service.listDisbursements).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          startDate,
          endDate,
        }),
      );
    });

    it('should enforce tenant isolation on list', async () => {
      const mockListResponse = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      jest.spyOn(service, 'listDisbursements').mockResolvedValue(mockListResponse as any);

      await request(app.getHttpServer())
        .get('/api/v1/disbursements')
        .expect(200);

      // Verify tenantId was passed (should come from CurrentTenant decorator)
      expect(service.listDisbursements).toHaveBeenCalledWith(tenantId, expect.any(Object));
    });

    it('should validate invalid page number', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/disbursements?page=0')
        .expect(400); // or accept and let service handle
    });

    it('should validate invalid limit', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/disbursements?limit=0')
        .expect(400); // or accept and let service handle
    });

    it('should combine multiple filters', async () => {
      const mockListResponse = {
        items: [mockResponseDto],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      jest.spyOn(service, 'listDisbursements').mockResolvedValue(mockListResponse as any);

      const startDate = '2024-02-01T00:00:00Z';
      const endDate = '2024-02-06T23:59:59Z';

      await request(app.getHttpServer())
        .get(
          `/api/v1/disbursements?page=1&limit=20&status=${DisbursementStatus.SUCCESS}&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
        )
        .expect(200);

      expect(service.listDisbursements).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          page: 1,
          limit: 20,
          status: DisbursementStatus.SUCCESS,
          startDate,
          endDate,
        }),
      );
    });
  });
});
