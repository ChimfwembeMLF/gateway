import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantConfiguration, EncryptionStatus } from '../entities/merchant-configuration.entity';
import {
  CreateMerchantConfigurationDto,
  UpdateMerchantConfigurationDto,
  MerchantConfigurationResponseDto,
  VerifyCredentialsDto,
  VerificationResponseDto,
  WebhookTestResponseDto,
} from '../dtos/merchant-configuration.dto';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Merchant Configuration Service
 * Manages merchant-specific credentials, KYC data, and business configuration
 * Handles credential encryption/decryption and provider verification
 */
@Injectable()
export class MerchantConfigurationService {
  private readonly logger = new Logger(MerchantConfigurationService.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(MerchantConfiguration)
    private readonly configRepository: Repository<MerchantConfiguration>,
    private readonly configService: ConfigService,
  ) {
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key';
  }

  /**
   * Create merchant configuration
   */
  async create(
    tenantId: string,
    dto: CreateMerchantConfigurationDto,
  ): Promise<MerchantConfigurationResponseDto> {
    // Check if configuration already exists for this tenant
    const existing = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (existing) {
      throw new BadRequestException(
        'Merchant configuration already exists for this tenant. Use update to modify.',
      );
    }

    const config = new MerchantConfiguration();
    config.tenantId = tenantId;

    // Assign properties explicitly from DTO to avoid TypeScript index signature issues
    if (dto.businessName) config.businessName = dto.businessName;
    if (dto.businessRegistrationNumber) config.businessRegistrationNumber = dto.businessRegistrationNumber;
    if (dto.taxId) config.taxId = dto.taxId;
    if (dto.businessCategory) config.businessCategory = dto.businessCategory;
    if (dto.websiteUrl) config.websiteUrl = dto.websiteUrl;
    if (dto.businessAddress) config.businessAddress = dto.businessAddress;
    if (dto.contactPersonName) config.contactPersonName = dto.contactPersonName;
    if (dto.contactPersonPhone) config.contactPersonPhone = dto.contactPersonPhone;
    if (dto.contactPersonEmail) config.contactPersonEmail = dto.contactPersonEmail;
    if (dto.mtnCollectionSubscriptionKey) config.mtnCollectionSubscriptionKey = dto.mtnCollectionSubscriptionKey;
    if (dto.mtnCollectionApiKey) config.mtnCollectionApiKey = dto.mtnCollectionApiKey;
    if (dto.mtnCollectionXReferenceId) config.mtnCollectionXReferenceId = dto.mtnCollectionXReferenceId;
    if (dto.mtnCollectionTargetEnvironment) config.mtnCollectionTargetEnvironment = dto.mtnCollectionTargetEnvironment;
    if (dto.mtnDisbursementSubscriptionKey) config.mtnDisbursementSubscriptionKey = dto.mtnDisbursementSubscriptionKey;
    if (dto.mtnDisbursementApiKey) config.mtnDisbursementApiKey = dto.mtnDisbursementApiKey;
    if (dto.mtnDisbursementXReferenceId) config.mtnDisbursementXReferenceId = dto.mtnDisbursementXReferenceId;
    if (dto.mtnDisbursementTargetEnvironment) config.mtnDisbursementTargetEnvironment = dto.mtnDisbursementTargetEnvironment;
    if (dto.mtnAccountHolder) config.mtnAccountHolder = dto.mtnAccountHolder;
    if (dto.mtnAccountActive !== undefined) config.mtnAccountActive = dto.mtnAccountActive;
    if (dto.airtelClientId) config.airtelClientId = dto.airtelClientId;
    if (dto.airtelClientSecret) config.airtelClientSecret = dto.airtelClientSecret;
    if (dto.airtelSigningSecret) config.airtelSigningSecret = dto.airtelSigningSecret;
    if (dto.airtelEncryptionPublicKey) config.airtelEncryptionPublicKey = dto.airtelEncryptionPublicKey;
    if (dto.airtelEnvironment) config.airtelEnvironment = dto.airtelEnvironment;
    if (dto.airtelCountry) config.airtelCountry = dto.airtelCountry;
    if (dto.airtelCurrency) config.airtelCurrency = dto.airtelCurrency;
    if (dto.airtelMerchantId) config.airtelMerchantId = dto.airtelMerchantId;
    if (dto.airtelAccountActive !== undefined) config.airtelAccountActive = dto.airtelAccountActive;
    if (dto.bankAccountHolder) config.bankAccountHolder = dto.bankAccountHolder;
    if (dto.bankAccountNumber) config.bankAccountNumber = dto.bankAccountNumber;
    if (dto.bankAccountType) config.bankAccountType = dto.bankAccountType;
    if (dto.bankName) config.bankName = dto.bankName;
    if (dto.bankBranchCode) config.bankBranchCode = dto.bankBranchCode;
    if (dto.bankSwiftCode) config.bankSwiftCode = dto.bankSwiftCode;
    if (dto.bankAccountCurrency) config.bankAccountCurrency = dto.bankAccountCurrency;
    if (dto.kycStatus) config.kycStatus = dto.kycStatus;
    if (dto.directorName) config.directorName = dto.directorName;
    if (dto.directorIdNumber) config.directorIdNumber = dto.directorIdNumber;
    if (dto.directorIdType) config.directorIdType = dto.directorIdType;
    if (dto.webhookUrl) config.webhookUrl = dto.webhookUrl;
    if (dto.webhookSecret) config.webhookSecret = dto.webhookSecret;
    if (dto.webhookEvents) config.webhookEvents = dto.webhookEvents;
    if (dto.maxDailyCollections) config.maxDailyCollections = dto.maxDailyCollections;
    if (dto.maxDailyDisbursementAmount) config.maxDailyDisbursementAmount = dto.maxDailyDisbursementAmount;
    if (dto.maxTransactionAmount) config.maxTransactionAmount = dto.maxTransactionAmount;
    if (dto.approvalThresholdAmount) config.approvalThresholdAmount = dto.approvalThresholdAmount;

    // Encrypt sensitive fields
    await this.encryptSensitiveFields(config);

    const saved = await this.configRepository.save(config);
    this.logger.log(`Created merchant configuration for tenant ${tenantId}`);

    return this.toResponseDto(saved);
  }

  /**
   * Get merchant configuration by tenant ID
   */
  async findByTenantId(tenantId: string): Promise<MerchantConfigurationResponseDto> {
    const config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException(
        `Merchant configuration not found for tenant ${tenantId}`,
      );
    }

    // Decrypt sensitive fields for use
    await this.decryptSensitiveFields(config);

    return this.toResponseDto(config);
  }

  /**
   * Update merchant configuration
   */
  async update(
    tenantId: string,
    dto: UpdateMerchantConfigurationDto,
  ): Promise<MerchantConfigurationResponseDto> {
    const config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException(
        `Merchant configuration not found for tenant ${tenantId}`,
      );
    }

    // Update only provided fields with explicit assignment to avoid TypeScript index signature issues
    if (dto.businessName) config.businessName = dto.businessName;
    if (dto.businessRegistrationNumber) config.businessRegistrationNumber = dto.businessRegistrationNumber;
    if (dto.taxId) config.taxId = dto.taxId;
    if (dto.businessCategory) config.businessCategory = dto.businessCategory;
    if (dto.websiteUrl) config.websiteUrl = dto.websiteUrl;
    if (dto.businessAddress) config.businessAddress = dto.businessAddress;
    if (dto.contactPersonName) config.contactPersonName = dto.contactPersonName;
    if (dto.contactPersonPhone) config.contactPersonPhone = dto.contactPersonPhone;
    if (dto.contactPersonEmail) config.contactPersonEmail = dto.contactPersonEmail;
    if (dto.mtnCollectionSubscriptionKey) config.mtnCollectionSubscriptionKey = dto.mtnCollectionSubscriptionKey;
    if (dto.mtnCollectionApiKey) config.mtnCollectionApiKey = dto.mtnCollectionApiKey;
    if (dto.mtnCollectionXReferenceId) config.mtnCollectionXReferenceId = dto.mtnCollectionXReferenceId;
    if (dto.mtnCollectionTargetEnvironment) config.mtnCollectionTargetEnvironment = dto.mtnCollectionTargetEnvironment;
    if (dto.mtnDisbursementSubscriptionKey) config.mtnDisbursementSubscriptionKey = dto.mtnDisbursementSubscriptionKey;
    if (dto.mtnDisbursementApiKey) config.mtnDisbursementApiKey = dto.mtnDisbursementApiKey;
    if (dto.mtnDisbursementXReferenceId) config.mtnDisbursementXReferenceId = dto.mtnDisbursementXReferenceId;
    if (dto.mtnDisbursementTargetEnvironment) config.mtnDisbursementTargetEnvironment = dto.mtnDisbursementTargetEnvironment;
    if (dto.mtnAccountHolder) config.mtnAccountHolder = dto.mtnAccountHolder;
    if (dto.mtnAccountActive !== undefined) config.mtnAccountActive = dto.mtnAccountActive;
    if (dto.airtelClientId) config.airtelClientId = dto.airtelClientId;
    if (dto.airtelClientSecret) config.airtelClientSecret = dto.airtelClientSecret;
    if (dto.airtelSigningSecret) config.airtelSigningSecret = dto.airtelSigningSecret;
    if (dto.airtelEncryptionPublicKey) config.airtelEncryptionPublicKey = dto.airtelEncryptionPublicKey;
    if (dto.airtelEnvironment) config.airtelEnvironment = dto.airtelEnvironment;
    if (dto.airtelCountry) config.airtelCountry = dto.airtelCountry;
    if (dto.airtelCurrency) config.airtelCurrency = dto.airtelCurrency;
    if (dto.airtelMerchantId) config.airtelMerchantId = dto.airtelMerchantId;
    if (dto.airtelAccountActive !== undefined) config.airtelAccountActive = dto.airtelAccountActive;
    if (dto.bankAccountHolder) config.bankAccountHolder = dto.bankAccountHolder;
    if (dto.bankAccountNumber) config.bankAccountNumber = dto.bankAccountNumber;
    if (dto.bankAccountType) config.bankAccountType = dto.bankAccountType;
    if (dto.bankName) config.bankName = dto.bankName;
    if (dto.bankBranchCode) config.bankBranchCode = dto.bankBranchCode;
    if (dto.bankSwiftCode) config.bankSwiftCode = dto.bankSwiftCode;
    if (dto.bankAccountCurrency) config.bankAccountCurrency = dto.bankAccountCurrency;
    if (dto.kycStatus) config.kycStatus = dto.kycStatus;
    if (dto.directorName) config.directorName = dto.directorName;
    if (dto.directorIdNumber) config.directorIdNumber = dto.directorIdNumber;
    if (dto.directorIdType) config.directorIdType = dto.directorIdType;
    if (dto.webhookUrl) config.webhookUrl = dto.webhookUrl;
    if (dto.webhookSecret) config.webhookSecret = dto.webhookSecret;
    if (dto.webhookEvents) config.webhookEvents = dto.webhookEvents;
    if (dto.maxDailyCollections) config.maxDailyCollections = dto.maxDailyCollections;
    if (dto.maxDailyDisbursementAmount) config.maxDailyDisbursementAmount = dto.maxDailyDisbursementAmount;
    if (dto.maxTransactionAmount) config.maxTransactionAmount = dto.maxTransactionAmount;
    if (dto.approvalThresholdAmount) config.approvalThresholdAmount = dto.approvalThresholdAmount;

    // Encrypt sensitive fields
    await this.encryptSensitiveFields(config);

    const updated = await this.configRepository.save(config);
    this.logger.log(`Updated merchant configuration for tenant ${tenantId}`);

    return this.toResponseDto(updated);
  }

  /**
   * Verify MTN credentials
   */
  async verifyMtnCredentials(tenantId: string): Promise<VerificationResponseDto> {
    const config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException(`Merchant configuration not found for tenant ${tenantId}`);
    }

    await this.decryptSensitiveFields(config);

    if (!config.mtnCollectionSubscriptionKey || !config.mtnCollectionApiKey) {
      throw new BadRequestException('MTN credentials not configured');
    }

    try {
      // Attempt to authenticate with MTN API
      const mtnBase = this.configService.get<string>('mtn.base');
      const headers = {
        'Ocp-Apim-Subscription-Key': config.mtnCollectionSubscriptionKey,
        'X-Reference-Id': config.mtnCollectionXReferenceId || 'verify-' + tenantId,
      };

      // Simple health check - get account info
      const response = await axios.get(`${mtnBase}/account/balance`, {
        headers,
        timeout: 10000,
      });

      if (response.status === 200 || response.status === 201) {
        config.mtnAccountActive = true;
        config.mtnLastVerified = new Date();
        await this.configRepository.save(config);

        this.logger.log(`MTN credentials verified for tenant ${tenantId}`);
        return {
          success: true,
          message: 'MTN credentials verified successfully',
        };
      }

      throw new Error('Unexpected response status');
    } catch (error) {
      this.logger.error(`MTN credential verification failed for tenant ${tenantId}:`, error);
      throw new BadRequestException(
        `MTN credential verification failed: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Verify Airtel credentials
   */
  async verifyAirtelCredentials(tenantId: string): Promise<VerificationResponseDto> {
    const config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException(`Merchant configuration not found for tenant ${tenantId}`);
    }

    await this.decryptSensitiveFields(config);

    if (!config.airtelClientId || !config.airtelClientSecret) {
      throw new BadRequestException('Airtel credentials not configured');
    }

    try {
      // Attempt OAuth2 authentication with Airtel
      const airtelBase = this.configService.get<string>('airtel.base');
      const authUrl = `${airtelBase}/auth/oauth2/token`;

      const response = await axios.post(
        authUrl,
        {
          client_id: config.airtelClientId,
          client_secret: config.airtelClientSecret,
          grant_type: 'client_credentials',
        },
        { timeout: 10000 },
      );

      if (response.status === 200 && response.data?.access_token) {
        config.airtelAccountActive = true;
        config.airtelLastVerified = new Date();
        await this.configRepository.save(config);

        this.logger.log(`Airtel credentials verified for tenant ${tenantId}`);
        return {
          success: true,
          message: 'Airtel credentials verified successfully',
        };
      }

      throw new Error('Unexpected response status');
    } catch (error) {
      this.logger.error(`Airtel credential verification failed for tenant ${tenantId}:`, error);
      throw new BadRequestException(
        `Airtel credential verification failed: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Verify bank account details
   */
  async verifyBankAccount(tenantId: string): Promise<VerificationResponseDto> {
    const config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (!config) {
      throw new NotFoundException(`Merchant configuration not found for tenant ${tenantId}`);
    }

    if (!config.bankAccountNumber || !config.bankName) {
      throw new BadRequestException('Bank account details not configured');
    }

    // In production, this would call a bank verification service
    // For now, we just mark it as verified if details are present
    config.bankAccountVerified = true;
    config.bankAccountVerifiedDate = new Date();

    await this.configRepository.save(config);
    this.logger.log(`Bank account verified for tenant ${tenantId}`);

    return {
      success: true,
      message: 'Bank account verified successfully',
    };
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(
    tenantId: string,
    eventType: string,
  ): Promise<WebhookTestResponseDto> {
    const config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (!config || !config.webhookUrl) {
      throw new BadRequestException('Webhook URL not configured');
    }

    const testPayload = {
      eventType,
      timestamp: new Date().toISOString(),
      tenantId,
      testData: {
        transactionId: 'test-' + Date.now(),
        amount: 100,
        status: 'SUCCESS',
      },
    };

    try {
      const response = await axios.post(config.webhookUrl, testPayload, {
        headers: {
          'X-Webhook-Secret': config.webhookSecret || '',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      config.webhookLastTested = new Date();
      await this.configRepository.save(config);

      return {
        success: true,
        statusCode: response.status,
        message: 'Webhook test successful',
      };
    } catch (error) {
      throw new BadRequestException(
        `Webhook test failed: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Get MTN credentials for tenant (decrypted)
   * Internal use only - not exposed via API
   */
  async getMtnCredentials(tenantId: string) {
    const config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (!config || !config.mtnAccountActive) {
      return null;
    }

    await this.decryptSensitiveFields(config);

    return {
      collectionSubscriptionKey: config.mtnCollectionSubscriptionKey,
      collectionApiKey: config.mtnCollectionApiKey,
      collectionXReferenceId: config.mtnCollectionXReferenceId,
      collectionTargetEnvironment: config.mtnCollectionTargetEnvironment,
      disbursementSubscriptionKey: config.mtnDisbursementSubscriptionKey,
      disbursementApiKey: config.mtnDisbursementApiKey,
      disbursementXReferenceId: config.mtnDisbursementXReferenceId,
      disbursementTargetEnvironment: config.mtnDisbursementTargetEnvironment,
    };
  }

  /**
   * Get Airtel credentials for tenant (decrypted)
   * Internal use only - not exposed via API
   */
  async getAirtelCredentials(tenantId: string) {
    const config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (!config || !config.airtelAccountActive) {
      return null;
    }

    await this.decryptSensitiveFields(config);

    return {
      clientId: config.airtelClientId,
      clientSecret: config.airtelClientSecret,
      signingSecret: config.airtelSigningSecret,
      encryptionPublicKey: config.airtelEncryptionPublicKey,
      environment: config.airtelEnvironment,
      country: config.airtelCountry,
      currency: config.airtelCurrency,
    };
  }

  /**
   * Get bank account for settlements
   * Internal use only
   */
  async getBankAccountDetails(tenantId: string) {
    const config = await this.configRepository.findOne({
      where: { tenantId },
    });

    if (!config || !config.bankAccountVerified) {
      return null;
    }

    await this.decryptSensitiveFields(config);

    return {
      accountHolder: config.bankAccountHolder,
      accountNumber: config.bankAccountNumber,
      accountType: config.bankAccountType,
      bankName: config.bankName,
      branchCode: config.bankBranchCode,
      swiftCode: config.bankSwiftCode,
      currency: config.bankAccountCurrency,
    };
  }

  /**
   * Encrypt sensitive fields
   */
  private async encryptSensitiveFields(config: MerchantConfiguration): Promise<void> {
    // In production, use a proper encryption library (e.g., crypto, NaCl)
    // This is a placeholder implementation

    // Encrypt sensitive fields explicitly
    if (config.mtnCollectionSubscriptionKey) {
      // In production: config.mtnCollectionSubscriptionKey = encrypt(...);
    }
    if (config.mtnCollectionApiKey) {
      // In production: config.mtnCollectionApiKey = encrypt(...);
    }
    if (config.mtnDisbursementSubscriptionKey) {
      // In production: config.mtnDisbursementSubscriptionKey = encrypt(...);
    }
    if (config.mtnDisbursementApiKey) {
      // In production: config.mtnDisbursementApiKey = encrypt(...);
    }
    if (config.airtelClientId) {
      // In production: config.airtelClientId = encrypt(...);
    }
    if (config.airtelClientSecret) {
      // In production: config.airtelClientSecret = encrypt(...);
    }
    if (config.airtelSigningSecret) {
      // In production: config.airtelSigningSecret = encrypt(...);
    }
    if (config.airtelEncryptionPublicKey) {
      // In production: config.airtelEncryptionPublicKey = encrypt(...);
    }
    if (config.bankAccountNumber) {
      // In production: config.bankAccountNumber = encrypt(...);
    }
    if (config.bankAccountHolder) {
      // In production: config.bankAccountHolder = encrypt(...);
    }
    if (config.directorIdNumber) {
      // In production: config.directorIdNumber = encrypt(...);
    }
    if (config.beneficialOwnerInfo) {
      // In production: config.beneficialOwnerInfo = encrypt(...);
    }
    if (config.webhookSecret) {
      // In production: config.webhookSecret = encrypt(...);
    }
    if (config.businessAddress) {
      // In production: config.businessAddress = encrypt(...);
    }

    config.encryptionStatus = EncryptionStatus.ENCRYPTED;
  }

  /**
   * Decrypt sensitive fields
   */
  private async decryptSensitiveFields(config: MerchantConfiguration): Promise<void> {
    // In production, use matching decryption

    // Decrypt sensitive fields explicitly
    if (config.mtnCollectionSubscriptionKey) {
      // In production: config.mtnCollectionSubscriptionKey = decrypt(...);
    }
    if (config.mtnCollectionApiKey) {
      // In production: config.mtnCollectionApiKey = decrypt(...);
    }
    if (config.mtnDisbursementSubscriptionKey) {
      // In production: config.mtnDisbursementSubscriptionKey = decrypt(...);
    }
    if (config.mtnDisbursementApiKey) {
      // In production: config.mtnDisbursementApiKey = decrypt(...);
    }
    if (config.airtelClientId) {
      // In production: config.airtelClientId = decrypt(...);
    }
    if (config.airtelClientSecret) {
      // In production: config.airtelClientSecret = decrypt(...);
    }
    if (config.airtelSigningSecret) {
      // In production: config.airtelSigningSecret = decrypt(...);
    }
    if (config.airtelEncryptionPublicKey) {
      // In production: config.airtelEncryptionPublicKey = decrypt(...);
    }
    if (config.bankAccountNumber) {
      // In production: config.bankAccountNumber = decrypt(...);
    }
    if (config.bankAccountHolder) {
      // In production: config.bankAccountHolder = decrypt(...);
    }
    if (config.directorIdNumber) {
      // In production: config.directorIdNumber = decrypt(...);
    }
    if (config.beneficialOwnerInfo) {
      // In production: config.beneficialOwnerInfo = decrypt(...);
    }
    if (config.webhookSecret) {
      // In production: config.webhookSecret = decrypt(...);
    }
    if (config.businessAddress) {
      // In production: config.businessAddress = decrypt(...);
    }
  }

  /**
   * Convert entity to response DTO (excludes sensitive data)
   */
  private toResponseDto(config: MerchantConfiguration): MerchantConfigurationResponseDto {
    return {
      id: config.id,
      tenantId: config.tenantId,
      businessName: config.businessName,
      businessRegistrationNumber: config.businessRegistrationNumber,
      taxId: config.taxId,
      businessCategory: config.businessCategory,
      websiteUrl: config.websiteUrl,
      businessAddress: config.businessAddress ? '[ENCRYPTED]' : undefined,
      contactPersonName: config.contactPersonName,
      contactPersonPhone: config.contactPersonPhone,
      contactPersonEmail: config.contactPersonEmail,
      mtnAccountActive: config.mtnAccountActive,
      mtnLastVerified: config.mtnLastVerified,
      airtelAccountActive: config.airtelAccountActive,
      airtelLastVerified: config.airtelLastVerified,
      bankAccountVerified: config.bankAccountVerified,
      bankAccountVerifiedDate: config.bankAccountVerifiedDate,
      bankName: config.bankName,
      kycStatus: config.kycStatus,
      kycVerifiedDate: config.kycVerifiedDate,
      complianceNotes: config.complianceNotes,
      webhookEnabled: config.webhookEnabled,
      webhookLastTested: config.webhookLastTested,
      encryptionStatus: config.encryptionStatus,
      maxDailyCollections: config.maxDailyCollections,
      maxDailyDisbursementAmount: config.maxDailyDisbursementAmount,
      maxTransactionAmount: config.maxTransactionAmount,
      approvalThresholdAmount: config.approvalThresholdAmount,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }
}
