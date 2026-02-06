import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Disbursement, PaymentProvider } from '../entities/disbursement.entity';
import { DisbursementRepository } from '../repositories/disbursement.repository';
import { CreateDisbursementDto, PaymentProvider as DtoPaymentProvider } from '../dto/create-disbursement.dto';
import { DisbursementResponseDto } from '../dto/disbursement-response.dto';
import { ListDisbursementsQueryDto } from '../dto/list-disbursements-query.dto';
import { DisbursementStatus } from 'src/common/enums/disbursement-status.enum';
import { AirtelDisbursementService } from '../../airtel/disbursement/airtel-disbursement.service';
import { AirtelSigningService } from '../../airtel/signing/airtel-signing.service';
import { AirtelDisbursementRequestDto } from '../../airtel/dto/airtel-payment.dto';
import { DisbursementService as MtnDisbursementService } from '../../mtn/disbursement/disbursement.service';
import { StructuredLoggingService } from 'src/common/logging';

/**
 * Disbursements Service
 * Core business logic for disbursement operations (supports multiple providers)
 *
 * Responsibilities:
 * - Validate disbursement requests
 * - Route to correct provider (Airtel or MTN)
 * - Enforce multi-tenant isolation
 * - Manage disbursement lifecycle (PENDING → SUCCESS/FAILED)
 * - Maintain audit trails
 */
@Injectable()
export class DisbursementsService {
  private readonly logger = new Logger(DisbursementsService.name);

  constructor(
    @InjectRepository(Disbursement)
    private readonly disbursementRepository: DisbursementRepository,
    private readonly airtelDisbursementService: AirtelDisbursementService,
    private readonly airtelSigningService: AirtelSigningService,
    @Optional() private readonly mtnDisbursementService?: MtnDisbursementService,
    @Optional() private readonly loggingService?: StructuredLoggingService,
  ) {}

  /**
   * Create a new disbursement (money-out) transaction
   * 1. Validates input and idempotency
   * 2. Creates PENDING disbursement record
   * 3. Routes to correct provider (Airtel or MTN)
   * 4. Updates status based on response
   *
   * @param createDto Disbursement request
   * @param tenantId Tenant ID (from API key)
   * @returns Created disbursement with current status
   * @throws ConflictException if externalId already exists for tenant
   * @throws BadRequestException for validation errors or unsupported provider
   * @throws InternalServerErrorException if provider API fails
   */
  async createDisbursement(
    createDto: CreateDisbursementDto,
    tenantId: string,
  ): Promise<DisbursementResponseDto> {
    try {
      // Step 1: Validate request
      this.validateDisbursementRequest(createDto);

      // Step 2: Normalize MSISDN
      const normalizedMsisdn = this.normalizeMsisdn(createDto.payeeMsisdn);

      // Step 3: Check for idempotency (duplicate externalId)
      const existingDisbursement = await this.disbursementRepository.findByExternalId(
        tenantId,
        createDto.externalId,
      );

      if (existingDisbursement) {
        this.logger.warn('Duplicate disbursement request detected', {
          tenantId,
          externalId: createDto.externalId,
          existingId: existingDisbursement.id,
          provider: createDto.provider,
        });

        // Return existing disbursement (idempotent behavior)
        return this.mapToResponseDto(existingDisbursement);
      }

      // Step 4: Route to correct provider
      if (createDto.provider === DtoPaymentProvider.AIRTEL) {
        return await this.processAirtelDisbursement(createDto, tenantId, normalizedMsisdn);
      } else if (createDto.provider === DtoPaymentProvider.MTN) {
        return await this.processMtnDisbursement(createDto, tenantId, normalizedMsisdn);
      } else {
        throw new BadRequestException(`Unsupported provider: ${createDto.provider}`);

      } 
    } catch (error) {
      this.logger.error('Error creating disbursement', {
        error: error.message,
        stack: error.stack,
        provider: createDto.provider,
      });
      throw error;
    }
  }

  /**
   * Process Airtel disbursement
   */
  private async processAirtelDisbursement(
    createDto: CreateDisbursementDto,
    tenantId: string,
    normalizedMsisdn: string,
  ): Promise<DisbursementResponseDto> {
    // Step 1: Encrypt PIN
    const encryptedPin = this.airtelSigningService.encryptPin(createDto.pin);

    // Step 2: Create disbursement record in PENDING status
    const disbursement = this.disbursementRepository.create({
      provider: PaymentProvider.AIRTEL,
      tenantId,
      externalId: createDto.externalId,
      payeeMsisdn: normalizedMsisdn,
      amount: createDto.amount.toString(),
      currency: createDto.currency || 'ZMW',
      reference: createDto.reference,
      encryptedPin,
      walletType: createDto.walletType,
      transactionType: createDto.transactionType,
      status: DisbursementStatus.PENDING,
    });

    await this.disbursementRepository.save(disbursement);

    this.loggingService?.logPaymentOperation(
      'DISBURSEMENT',
      'INITIATE',
      disbursement.id,
      {
        provider: 'AIRTEL',
        tenantId,
        amount: parseFloat(disbursement.amount),
        currency: disbursement.currency,
        payee: normalizedMsisdn,
        status: disbursement.status,
      },
    );

    // Step 3: Build Airtel request
    const airtelRequest: AirtelDisbursementRequestDto = {
      reference: createDto.reference,
      subscriber: {
        country: 'ZM',
        msisdn: normalizedMsisdn,
        currency: createDto.currency || 'ZMW',
      },
      transaction: {
        id: createDto.externalId,
        amount: createDto.amount,
        country: 'ZM',
        currency: createDto.currency || 'ZMW',
        type: createDto.transactionType,
      },
      pin: encryptedPin,
      wallet_type: createDto.walletType,
    };

    // Step 4: Call Airtel API
    let airtelResponse;
    try {
      disbursement.status = DisbursementStatus.PROCESSING;
      await this.disbursementRepository.save(disbursement);

      airtelResponse = await this.airtelDisbursementService.createDisbursement(
        airtelRequest,
      );

      this.loggingService?.logPaymentOperation(
        'DISBURSEMENT',
        'PROCESS',
        disbursement.id,
        {
          provider: 'AIRTEL',
          tenantId,
          amount: parseFloat(disbursement.amount),
          currency: disbursement.currency,
          payee: normalizedMsisdn,
          status: 'PROCESSING',
        },
      );
    } catch (error) {
      disbursement.status = DisbursementStatus.FAILED;
      disbursement.errorCode = this.getErrorCode(error);
      disbursement.errorMessage = this.getErrorMessage(error);
      await this.disbursementRepository.save(disbursement);

      this.logger.error('Airtel disbursement request failed', {
        disbursementId: disbursement.id,
        error: error.message,
        errorCode: disbursement.errorCode,
      });

      return this.mapToResponseDto(disbursement);
    }

    // Step 5: Update disbursement with Airtel response
    if (airtelResponse?.status?.success) {
      disbursement.status = DisbursementStatus.SUCCESS;
      disbursement.airtelReferenceId = airtelResponse?.data?.transaction?.id;
      disbursement.airtelMoneyId = airtelResponse?.data?.transaction?.id;
    } else {
      disbursement.status = DisbursementStatus.FAILED;
      disbursement.errorCode = airtelResponse?.status?.response_code || 'AIRTEL_ERROR';
      disbursement.errorMessage =
        airtelResponse?.status?.message || 'Disbursement failed at Airtel';
    }

    await this.disbursementRepository.save(disbursement);

    this.loggingService?.logPaymentOperation(
      'DISBURSEMENT',
      disbursement.status === DisbursementStatus.SUCCESS ? 'COMPLETE' : 'FAIL',
      disbursement.id,
      {
        provider: 'AIRTEL',
        tenantId,
        amount: parseFloat(disbursement.amount),
        currency: disbursement.currency,
        payee: normalizedMsisdn,
        status: disbursement.status,
        error: disbursement.errorMessage || undefined,
      },
    );

    return this.mapToResponseDto(disbursement);
  }

  /**
   * Process MTN disbursement
   */
  private async processMtnDisbursement(
    createDto: CreateDisbursementDto,
    tenantId: string,
    normalizedMsisdn: string,
  ): Promise<DisbursementResponseDto> {
    if (!this.mtnDisbursementService) {
      throw new BadRequestException('MTN disbursement service not configured');
    }

    // Step 1: Create disbursement record in PENDING status
    const disbursement = this.disbursementRepository.create({
      provider: PaymentProvider.MTN,
      tenantId,
      externalId: createDto.externalId,
      payeeMsisdn: normalizedMsisdn,
      amount: createDto.amount.toString(),
      currency: createDto.currency || 'ZMW',
      reference: createDto.reference,
      encryptedPin: '', // MTN doesn't use PIN
      walletType: createDto.walletType,
      transactionType: createDto.transactionType,
      status: DisbursementStatus.PENDING,
    });

    await this.disbursementRepository.save(disbursement);

    this.loggingService?.logPaymentOperation(
      'DISBURSEMENT',
      'INITIATE',
      disbursement.id,
      {
        provider: 'MTN',
        tenantId,
        amount: parseFloat(disbursement.amount),
        currency: disbursement.currency,
        payee: normalizedMsisdn,
        status: disbursement.status,
      },
    );

    // Step 2: Build MTN request
    const mtnRequest = {
      amount: createDto.amount.toString(),
      currency: createDto.currency || 'ZMW',
      payee: {
        partyIdType: 'MSISDN',
        partyId: normalizedMsisdn,
      },
      payerMessage: createDto.reference,
      payeeNote: createDto.reference,
      referenceId: createDto.externalId,
    };

    // Step 3: Call MTN API
    try {
      disbursement.status = DisbursementStatus.PROCESSING;
      await this.disbursementRepository.save(disbursement);

      const mtnResponse = await this.mtnDisbursementService.transfer(
        mtnRequest as any,
        tenantId,
        null,
      );

      this.loggingService?.logPaymentOperation(
        'DISBURSEMENT',
        'PROCESS',
        disbursement.id,
        {
          provider: 'MTN',
          tenantId,
          amount: parseFloat(disbursement.amount),
          currency: disbursement.currency,
          payee: normalizedMsisdn,
          status: 'PROCESSING',
        },
      );

      if (mtnResponse?.success) {
        disbursement.status = DisbursementStatus.SUCCESS;
        disbursement.airtelReferenceId = mtnResponse.referenceId; // Reuse field for MTN reference
      } else {
        disbursement.status = DisbursementStatus.FAILED;
        disbursement.errorCode = 'MTN_ERROR';
        disbursement.errorMessage = 'MTN disbursement failed';
      }
    } catch (error) {
      disbursement.status = DisbursementStatus.FAILED;
      disbursement.errorCode = this.getErrorCode(error);
      disbursement.errorMessage = this.getErrorMessage(error);

      this.logger.error('MTN disbursement request failed', {
        disbursementId: disbursement.id,
        error: error.message,
        errorCode: disbursement.errorCode,
      });
    }

    await this.disbursementRepository.save(disbursement);

    this.loggingService?.logPaymentOperation(
      'DISBURSEMENT',
      disbursement.status === DisbursementStatus.SUCCESS ? 'COMPLETE' : 'FAIL',
      disbursement.id,
      {
        provider: 'MTN',
        tenantId,
        amount: parseFloat(disbursement.amount),
        currency: disbursement.currency,
        payee: normalizedMsisdn,
        status: disbursement.status,
        error: disbursement.errorMessage || undefined,
      },
    );

    return this.mapToResponseDto(disbursement);
  }

  /**
   * Get disbursement details by ID
   * Enforces tenant isolation
   *
   * @param id Disbursement ID
   * @param tenantId Tenant ID
   * @returns Disbursement details
   * @throws NotFoundException if not found
   */
  async getDisbursement(id: string, tenantId: string): Promise<DisbursementResponseDto> {
    const disbursement = await this.disbursementRepository.findByIdForTenant(id, tenantId);

    if (!disbursement) {
      throw new BadRequestException(
        `Disbursement not found: ${id}`,
      );
    }

    return this.mapToResponseDto(disbursement);
  }

  /**
   * List disbursements for a tenant with filtering and pagination
   *
   * @param tenantId Tenant ID
   * @param query Filter and pagination options
   * @returns Paginated list of disbursements
   */
  async listDisbursements(
    tenantId: string,
    query: ListDisbursementsQueryDto,
  ): Promise<{
    items: DisbursementResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Parse date range if provided
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const [disbursements, total] = await this.disbursementRepository.listByTenant(tenantId, {
      status: query.status,
      startDate,
      endDate,
      skip,
      take: limit,
    });

    return {
      items: disbursements.map((d) => this.mapToResponseDto(d)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get disbursements by status (for monitoring/analytics)
   *
   * @param tenantId Tenant ID
   * @param status Status to filter by
   * @returns Count of disbursements with that status
   */
  async countByStatus(tenantId: string, status: DisbursementStatus): Promise<number> {
    return this.disbursementRepository.countByStatus(tenantId, status);
  }

  /**
   * Validate disbursement request
   * @throws BadRequestException if validation fails
   */
  private validateDisbursementRequest(createDto: CreateDisbursementDto): void {
    // Amount must be positive
    if (createDto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Amount precision check (max 2 decimal places for most currencies)
    if (!/^\d+(\.\d{1,2})?$/.test(createDto.amount.toString())) {
      throw new BadRequestException('Amount must have max 2 decimal places');
    }

    // PIN must be exactly 4 digits (validation happens in DTO, but double-check)
    if (!/^\d{4}$/.test(createDto.pin)) {
      throw new BadRequestException('PIN must be exactly 4 digits');
    }

    // External ID must be provided for idempotency
    if (!createDto.externalId || createDto.externalId.trim().length === 0) {
      throw new BadRequestException('externalId is required for idempotency');
    }

    // Reference for reconciliation
    if (!createDto.reference || createDto.reference.trim().length === 0) {
      throw new BadRequestException('reference is required');
    }
  }

  /**
   * Normalize MSISDN by removing country code prefix if present
   * Converts: +260977123456 → 0977123456
   * Converts: 260977123456 → 0977123456
   *
   * @param msisdn Mobile number (may include country code)
   * @returns Normalized MSISDN without country code
   */
  private normalizeMsisdn(msisdn: string): string {
    let normalized = msisdn.trim();

    // Remove + if present
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }

    // Remove country code (260 for Zambia) if present
    if (normalized.startsWith('260')) {
      normalized = '0' + normalized.substring(3);
    }

    // Validate format
    if (!/^0\d{9,14}$/.test(normalized)) {
      throw new BadRequestException(
        `Invalid MSISDN format after normalization: ${normalized}`,
      );
    }

    return normalized;
  }

  /**
   * Map Disbursement entity to response DTO
   * Strips sensitive data (encryptedPin)
   */
  private mapToResponseDto(disbursement: Disbursement): DisbursementResponseDto {
    return {
      id: disbursement.id,
      provider: disbursement.provider as any,
      tenantId: disbursement.tenantId,
      externalId: disbursement.externalId,
      payeeMsisdn: disbursement.payeeMsisdn,
      walletType: disbursement.walletType,
      amount: disbursement.amount,
      currency: disbursement.currency,
      reference: disbursement.reference,
      transactionType: disbursement.transactionType,
      status: disbursement.status,
      airtelReferenceId: disbursement.airtelReferenceId,
      airtelMoneyId: disbursement.airtelMoneyId,
      errorCode: disbursement.errorCode,
      errorMessage: disbursement.errorMessage,
      createdAt: disbursement.createdAt,
      updatedAt: disbursement.updatedAt,
    };
  }

  /**
   * Extract error code from exception
   */
  private getErrorCode(error: any): string {
    if (error.response?.status) {
      return `HTTP_${error.response.status}`;
    }

    if (error.code) {
      return error.code;
    }

    if (error.message?.includes('timeout')) {
      return 'TIMEOUT';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Extract error message from exception
   */
  private getErrorMessage(error: any): string {
    if (error.message) {
      return error.message;
    }

    if (error.response?.data?.status?.message) {
      return error.response.data.status.message;
    }

    return 'Unknown error occurred';
  }
}
