import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DisbursementsService } from './disbursements.service';
import { DisbursementRepository } from '../repositories/disbursement.repository';
import { AirtelDisbursementService } from '../../airtel/disbursement/airtel-disbursement.service';
import { AirtelSigningService } from '../../airtel/signing/airtel-signing.service';
import { StructuredLoggingService } from 'src/common/logging';
import { Disbursement } from '../entities/disbursement.entity';
import { DisbursementStatus } from 'src/common/enums/disbursement-status.enum';
import { WalletType } from 'src/common/enums/wallet-type.enum';
import { TransactionType } from 'src/common/enums/transaction-type.enum';
import { PaymentProvider } from '../dto/create-disbursement.dto';

describe('DisbursementsService', () => {
  let service: DisbursementsService;
  let repository: DisbursementRepository;
  let airtelService: AirtelDisbursementService;
  let signingService: AirtelSigningService;
  let loggingService: StructuredLoggingService;

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

  const mockDisbursement: Partial<Disbursement> = {
    id: 'disb-001',
    tenantId,
    externalId: mockCreateDto.externalId,
    payeeMsisdn: mockCreateDto.payeeMsisdn,
    amount: mockCreateDto.amount.toString(),
    currency: mockCreateDto.currency,
    reference: mockCreateDto.reference,
    encryptedPin: 'encrypted_pin_data',
    walletType: mockCreateDto.walletType,
    transactionType: mockCreateDto.transactionType,
    status: DisbursementStatus.SUCCESS,
    airtelReferenceId: 'AIRTEL-12345',
    airtelMoneyId: 'MONEY-67890',
    errorCode: undefined,
    errorMessage: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisbursementsService,
        {
          provide: DisbursementRepository,
          useValue: {
            findByExternalId: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            findByIdForTenant: jest.fn(),
            listByTenant: jest.fn(),
            countByStatus: jest.fn(),
          },
        },
        {
          provide: AirtelDisbursementService,
          useValue: {
            createDisbursement: jest.fn(),
            queryDisbursementStatus: jest.fn(),
            refundDisbursement: jest.fn(),
          },
        },
        {
          provide: AirtelSigningService,
          useValue: {
            encryptPin: jest.fn(),
            generateSignature: jest.fn(),
            generateEncryptedKey: jest.fn(),
          },
        },
        {
          provide: StructuredLoggingService,
          useValue: {
            debug: jest.fn(),
            info: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DisbursementsService>(DisbursementsService);
    repository = module.get<DisbursementRepository>(DisbursementRepository);
    airtelService = module.get<AirtelDisbursementService>(AirtelDisbursementService);
    signingService = module.get<AirtelSigningService>(AirtelSigningService);
    loggingService = module.get<StructuredLoggingService>(StructuredLoggingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDisbursement', () => {
    it('should successfully create and process a disbursement', async () => {
      const mockAirtelResponse = {
        status: { success: true, message: 'Disbursement successful' },
        data: { transaction: { id: 'AIRTEL-12345' } },
      };

      jest.spyOn(repository, 'findByExternalId').mockResolvedValue(null);
      jest.spyOn(signingService, 'encryptPin').mockReturnValue('encrypted_pin');
      jest.spyOn(repository, 'create').mockReturnValue(mockDisbursement as Disbursement);
      jest.spyOn(repository, 'save').mockResolvedValue(mockDisbursement as Disbursement);
      jest.spyOn(airtelService, 'createDisbursement').mockResolvedValue(mockAirtelResponse);

      const result = await service.createDisbursement(mockCreateDto, tenantId);

      expect(result.id).toBe(mockDisbursement.id);
      expect(result.status).toBe(DisbursementStatus.SUCCESS);
      expect(result.airtelReferenceId).toBe('AIRTEL-12345');
      expect(signingService.encryptPin).toHaveBeenCalledWith('1234');
      expect(repository.save).toHaveBeenCalled();
    });

    it('should return existing disbursement for duplicate externalId (idempotency)', async () => {
      jest.spyOn(repository, 'findByExternalId').mockResolvedValue(mockDisbursement as Disbursement);

      const result = await service.createDisbursement(mockCreateDto, tenantId);

      expect(result.id).toBe(mockDisbursement.id);
      expect(repository.create).not.toHaveBeenCalled(); // Should not create duplicate
      expect(airtelService.createDisbursement).not.toHaveBeenCalled();
    });

    it('should handle Airtel API failure gracefully', async () => {
      const errorResponse = new InternalServerErrorException('Airtel API error');

      jest.spyOn(repository, 'findByExternalId').mockResolvedValue(null);
      jest.spyOn(signingService, 'encryptPin').mockReturnValue('encrypted_pin');
      jest.spyOn(repository, 'create').mockReturnValue(mockDisbursement as Disbursement);
      jest.spyOn(repository, 'save').mockResolvedValue(mockDisbursement as Disbursement);
      jest.spyOn(airtelService, 'createDisbursement').mockRejectedValue(errorResponse);

      const disbursementWithFailed = { ...mockDisbursement, status: DisbursementStatus.FAILED };
      jest.spyOn(repository, 'save').mockResolvedValueOnce(mockDisbursement as Disbursement); // PENDING
      jest.spyOn(repository, 'save').mockResolvedValueOnce(mockDisbursement as Disbursement); // PROCESSING
      jest.spyOn(repository, 'save').mockResolvedValueOnce(disbursementWithFailed as Disbursement); // FAILED

      const result = await service.createDisbursement(mockCreateDto, tenantId);

      expect(result.status).toBe(DisbursementStatus.FAILED);
      expect(result.errorCode).toBeTruthy();
    });

    it('should reject invalid amount (zero or negative)', async () => {
      const invalidDto = { ...mockCreateDto, amount: 0 };

      await expect(service.createDisbursement(invalidDto, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid amount (too many decimal places)', async () => {
      const invalidDto = { ...mockCreateDto, amount: 123.456 };

      await expect(service.createDisbursement(invalidDto, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid PIN (not 4 digits)', async () => {
      const invalidDto = { ...mockCreateDto, pin: '123' };

      await expect(service.createDisbursement(invalidDto, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject missing externalId', async () => {
      const invalidDto = { ...mockCreateDto, externalId: '' };

      await expect(service.createDisbursement(invalidDto, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject missing reference', async () => {
      const invalidDto = { ...mockCreateDto, reference: '' };

      await expect(service.createDisbursement(invalidDto, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should normalize MSISDN (remove country code)', async () => {
      const dtoWithCountryCode = {
        ...mockCreateDto,
        payeeMsisdn: '+260977123456', // With country code and +
      };

      jest.spyOn(repository, 'findByExternalId').mockResolvedValue(null);
      jest.spyOn(signingService, 'encryptPin').mockReturnValue('encrypted_pin');
      jest.spyOn(repository, 'create').mockReturnValue(mockDisbursement as Disbursement);
      jest.spyOn(repository, 'save').mockResolvedValue(mockDisbursement as Disbursement);
      jest.spyOn(airtelService, 'createDisbursement').mockResolvedValue({
        status: { success: true },
        data: { transaction: { id: 'AIRTEL-12345' } },
      });

      await service.createDisbursement(dtoWithCountryCode, tenantId);

      // Verify the repository was called with normalized MSISDN
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payeeMsisdn: '0977123456',
        }),
      );
    });

    it('should normalize MSISDN (260 prefix without +)', async () => {
      const dtoWithCountryCode = {
        ...mockCreateDto,
        payeeMsisdn: '260977123456', // Without +
      };

      jest.spyOn(repository, 'findByExternalId').mockResolvedValue(null);
      jest.spyOn(signingService, 'encryptPin').mockReturnValue('encrypted_pin');
      jest.spyOn(repository, 'create').mockReturnValue(mockDisbursement as Disbursement);
      jest.spyOn(repository, 'save').mockResolvedValue(mockDisbursement as Disbursement);
      jest.spyOn(airtelService, 'createDisbursement').mockResolvedValue({
        status: { success: true },
        data: { transaction: { id: 'AIRTEL-12345' } },
      });

      await service.createDisbursement(dtoWithCountryCode, tenantId);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payeeMsisdn: '0977123456',
        }),
      );
    });

    it('should reject invalid MSISDN after normalization', async () => {
      const invalidDto = { ...mockCreateDto, payeeMsisdn: '123' };

      await expect(service.createDisbursement(invalidDto, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should enforce tenant isolation', async () => {
      jest.spyOn(repository, 'findByExternalId').mockResolvedValue(null);
      jest.spyOn(signingService, 'encryptPin').mockReturnValue('encrypted_pin');
      jest.spyOn(repository, 'create').mockReturnValue(mockDisbursement as Disbursement);
      jest.spyOn(repository, 'save').mockResolvedValue(mockDisbursement as Disbursement);
      jest.spyOn(airtelService, 'createDisbursement').mockResolvedValue({
        status: { success: true },
        data: { transaction: { id: 'AIRTEL-12345' } },
      });

      await service.createDisbursement(mockCreateDto, tenantId);

      // Verify tenantId was passed to all repository operations
      expect(repository.findByExternalId).toHaveBeenCalledWith(tenantId, mockCreateDto.externalId);
      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ tenantId }));
    });
  });

  describe('getDisbursement', () => {
    it('should retrieve disbursement by ID', async () => {
      jest.spyOn(repository, 'findByIdForTenant').mockResolvedValue(mockDisbursement as Disbursement);

      const result = await service.getDisbursement(mockDisbursement.id!, tenantId);

      expect(result.id).toBe(mockDisbursement.id);
      expect(repository.findByIdForTenant).toHaveBeenCalledWith(mockDisbursement.id, tenantId);
    });

    it('should throw error if disbursement not found', async () => {
      jest.spyOn(repository, 'findByIdForTenant').mockResolvedValue(null);

      await expect(service.getDisbursement('invalid-id', tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should enforce tenant isolation on get', async () => {
      jest.spyOn(repository, 'findByIdForTenant').mockResolvedValue(mockDisbursement as Disbursement);

      await service.getDisbursement(mockDisbursement.id!, tenantId);

      expect(repository.findByIdForTenant).toHaveBeenCalledWith(mockDisbursement.id, tenantId);
    });
  });

  describe('listDisbursements', () => {
    it('should list disbursements with pagination', async () => {
      const mockDisbursements = [mockDisbursement as Disbursement];
      jest.spyOn(repository, 'listByTenant').mockResolvedValue([mockDisbursements, 1]);

      const result = await service.listDisbursements(tenantId, {
        page: 1,
        limit: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status', async () => {
      jest.spyOn(repository, 'listByTenant').mockResolvedValue([[], 0]);

      await service.listDisbursements(tenantId, {
        page: 1,
        limit: 20,
        status: DisbursementStatus.SUCCESS,
      });

      expect(repository.listByTenant).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          status: DisbursementStatus.SUCCESS,
        }),
      );
    });

    it('should filter by date range', async () => {
      jest.spyOn(repository, 'listByTenant').mockResolvedValue([[], 0]);

      const startDate = '2024-02-01T00:00:00Z';
      const endDate = '2024-02-06T23:59:59Z';

      await service.listDisbursements(tenantId, {
        page: 1,
        limit: 20,
        startDate,
        endDate,
      });

      expect(repository.listByTenant).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        }),
      );
    });

    it('should enforce tenant isolation on list', async () => {
      jest.spyOn(repository, 'listByTenant').mockResolvedValue([[], 0]);

      await service.listDisbursements(tenantId, { page: 1, limit: 20 });

      expect(repository.listByTenant).toHaveBeenCalledWith(tenantId, expect.any(Object));
    });

    it('should calculate pagination correctly', async () => {
      jest.spyOn(repository, 'listByTenant').mockResolvedValue([[], 150]);

      const result = await service.listDisbursements(tenantId, {
        page: 2,
        limit: 25,
      });

      expect(result.totalPages).toBe(6); // 150 / 25 = 6
      expect(repository.listByTenant).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          skip: 25, // (2-1) * 25
          take: 25,
        }),
      );
    });
  });

  describe('countByStatus', () => {
    it('should count disbursements by status', async () => {
      jest.spyOn(repository, 'countByStatus').mockResolvedValue(42);

      const result = await service.countByStatus(tenantId, DisbursementStatus.SUCCESS);

      expect(result).toBe(42);
      expect(repository.countByStatus).toHaveBeenCalledWith(tenantId, DisbursementStatus.SUCCESS);
    });
  });
});
