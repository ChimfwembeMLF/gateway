import {
  IsString,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  IsUrl,
  IsEnum,
  IsBoolean,
  IsDate,
  IsDecimal,
  IsObject,
  Length,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KycStatus, EncryptionStatus } from '../entities/merchant-configuration.entity';

/**
 * DTO for creating merchant configuration
 */
export class CreateMerchantConfigurationDto {
  // ============================================================================
  // BUSINESS INFORMATION
  // ============================================================================

  @ApiProperty({
    description: 'Legal business name',
    example: 'Acme Corporation Ltd',
  })
  @IsString()
  @MaxLength(255)
  businessName: string;

  @ApiPropertyOptional({
    description: 'Business registration number',
    example: 'BRN-123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessRegistrationNumber?: string;

  @ApiPropertyOptional({
    description: 'Tax ID / VAT number',
    example: 'TAX-ZM-123456',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Business category/industry',
    example: 'E-Commerce',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessCategory?: string;

  @ApiPropertyOptional({
    description: 'Business website URL',
    example: 'https://acme.com',
  })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiPropertyOptional({
    description: 'Physical business address (will be encrypted)',
    example: '123 Business Street, Lusaka, ZM',
  })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional({
    description: 'Primary contact person name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactPersonName?: string;

  @ApiPropertyOptional({
    description: 'Primary contact phone',
    example: '+260965123456',
  })
  @IsOptional()
  @IsPhoneNumber('ZM')
  contactPersonPhone?: string;

  @ApiPropertyOptional({
    description: 'Primary contact email',
    example: 'contact@acme.com',
  })
  @IsOptional()
  @IsEmail()
  contactPersonEmail?: string;

  // ============================================================================
  // MTN CREDENTIALS
  // ============================================================================

  @ApiPropertyOptional({
    description: 'MTN collection API subscription key (will be encrypted)',
    example: 'mtncoll_abc123xyz789',
  })
  @IsOptional()
  @IsString()
  mtnCollectionSubscriptionKey?: string;

  @ApiPropertyOptional({
    description: 'MTN collection API key (will be encrypted)',
    example: 'mtnkey_abc123xyz789',
  })
  @IsOptional()
  @IsString()
  mtnCollectionApiKey?: string;

  @ApiPropertyOptional({
    description: 'MTN collection X-Reference-ID',
    example: 'acme-mtn-ref-001',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  mtnCollectionXReferenceId?: string;

  @ApiPropertyOptional({
    description: 'MTN collection target environment',
    enum: ['sandbox', 'production'],
    default: 'sandbox',
  })
  @IsOptional()
  @IsEnum(['sandbox', 'production'])
  mtnCollectionTargetEnvironment?: string;

  @ApiPropertyOptional({
    description: 'MTN disbursement API subscription key (will be encrypted)',
  })
  @IsOptional()
  @IsString()
  mtnDisbursementSubscriptionKey?: string;

  @ApiPropertyOptional({
    description: 'MTN disbursement API key (will be encrypted)',
  })
  @IsOptional()
  @IsString()
  mtnDisbursementApiKey?: string;

  @ApiPropertyOptional({
    description: 'MTN disbursement X-Reference-ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  mtnDisbursementXReferenceId?: string;

  @ApiPropertyOptional({
    description: 'MTN disbursement target environment',
    enum: ['sandbox', 'production'],
    default: 'sandbox',
  })
  @IsOptional()
  @IsEnum(['sandbox', 'production'])
  mtnDisbursementTargetEnvironment?: string;

  @ApiPropertyOptional({
    description: 'MTN account holder name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  mtnAccountHolder?: string;

  @ApiPropertyOptional({
    description: 'MTN account is active',
  })
  @IsOptional()
  @IsBoolean()
  mtnAccountActive?: boolean;

  // ============================================================================
  // AIRTEL CREDENTIALS
  // ============================================================================

  @ApiPropertyOptional({
    description: 'Airtel OAuth2 Client ID (will be encrypted)',
    example: 'airtel_client_123',
  })
  @IsOptional()
  @IsString()
  airtelClientId?: string;

  @ApiPropertyOptional({
    description: 'Airtel OAuth2 Client Secret (will be encrypted)',
  })
  @IsOptional()
  @IsString()
  airtelClientSecret?: string;

  @ApiPropertyOptional({
    description: 'Airtel Signing Secret (will be encrypted)',
  })
  @IsOptional()
  @IsString()
  airtelSigningSecret?: string;

  @ApiPropertyOptional({
    description: 'Airtel RSA Public Key (will be encrypted)',
  })
  @IsOptional()
  @IsString()
  airtelEncryptionPublicKey?: string;

  @ApiPropertyOptional({
    description: 'Airtel environment',
    enum: ['staging', 'production'],
    default: 'staging',
  })
  @IsOptional()
  @IsEnum(['staging', 'production'])
  airtelEnvironment?: string;

  @ApiPropertyOptional({
    description: 'Airtel country code',
    example: 'ZM',
    default: 'ZM',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  airtelCountry?: string;

  @ApiPropertyOptional({
    description: 'Airtel default currency',
    example: 'ZMW',
    default: 'ZMW',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  airtelCurrency?: string;

  @ApiPropertyOptional({
    description: 'Airtel merchant account ID',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  airtelMerchantId?: string;

  @ApiPropertyOptional({
    description: 'Airtel account is active',
  })
  @IsOptional()
  @IsBoolean()
  airtelAccountActive?: boolean;

  // ============================================================================
  // BANK ACCOUNT INFORMATION
  // ============================================================================

  @ApiPropertyOptional({
    description: 'Bank account holder name',
    example: 'Acme Corporation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankAccountHolder?: string;

  @ApiPropertyOptional({
    description: 'Bank account number (will be encrypted)',
    example: '1234567890',
  })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({
    description: 'Bank account type',
    enum: ['checking', 'savings', 'business'],
  })
  @IsOptional()
  @IsString()
  bankAccountType?: string;

  @ApiPropertyOptional({
    description: 'Bank name',
    example: 'Zambia National Bank',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bankName?: string;

  @ApiPropertyOptional({
    description: 'Bank branch code',
    example: 'ZNBK-LSKX',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  bankBranchCode?: string;

  @ApiPropertyOptional({
    description: 'SWIFT/BIC code',
    example: 'ZNBKZMLU',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankSwiftCode?: string;

  @ApiPropertyOptional({
    description: 'Bank account currency',
    example: 'ZMW',
    default: 'ZMW',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  bankAccountCurrency?: string;

  // ============================================================================
  // KYC INFORMATION
  // ============================================================================

  @ApiPropertyOptional({
    description: 'KYC verification status',
    enum: KycStatus,
  })
  @IsOptional()
  @IsEnum(KycStatus)
  kycStatus?: KycStatus;

  @ApiPropertyOptional({
    description: 'Director/Owner name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  directorName?: string;

  @ApiPropertyOptional({
    description: 'Director/Owner ID number (will be encrypted)',
  })
  @IsOptional()
  @IsString()
  directorIdNumber?: string;

  @ApiPropertyOptional({
    description: 'Director/Owner ID type',
    enum: ['passport', 'national_id', 'driver_license'],
  })
  @IsOptional()
  @IsString()
  directorIdType?: string;

  @ApiPropertyOptional({
    description: 'Beneficial owner information (will be encrypted)',
  })
  @IsOptional()
  @IsString()
  beneficialOwnerInfo?: string;

  @ApiPropertyOptional({
    description: 'Compliance notes',
  })
  @IsOptional()
  @IsString()
  complianceNotes?: string;

  // ============================================================================
  // WEBHOOK CONFIGURATION
  // ============================================================================

  @ApiPropertyOptional({
    description: 'Webhook URL for payment notifications',
    example: 'https://acme.com/webhooks/payments',
  })
  @IsOptional()
  @IsUrl()
  webhookUrl?: string;

  @ApiPropertyOptional({
    description: 'Webhook signature key (will be encrypted)',
  })
  @IsOptional()
  @IsString()
  webhookSecret?: string;

  @ApiPropertyOptional({
    description: 'Webhook events to subscribe to',
    example: ['payment.success', 'payment.failed', 'disbursement.complete'],
  })
  @IsOptional()
  @IsObject()
  webhookEvents?: string[];

  @ApiPropertyOptional({
    description: 'Enable/disable webhook',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  webhookEnabled?: boolean;

  // ============================================================================
  // RATE LIMITS
  // ============================================================================

  @ApiPropertyOptional({
    description: 'Maximum daily collection requests',
    example: 10000,
    default: 10000,
  })
  @IsOptional()
  maxDailyCollections?: number;

  @ApiPropertyOptional({
    description: 'Maximum daily disbursement amount',
    example: '100000.00',
  })
  @IsOptional()
  @IsDecimal()
  maxDailyDisbursementAmount?: number;

  @ApiPropertyOptional({
    description: 'Single transaction maximum amount',
    example: '50000.00',
  })
  @IsOptional()
  @IsDecimal()
  maxTransactionAmount?: number;

  @ApiPropertyOptional({
    description: 'Require approval for transactions above this amount',
    example: '10000.00',
  })
  @IsOptional()
  @IsDecimal()
  approvalThresholdAmount?: number;

  // ============================================================================
  // ADDITIONAL
  // ============================================================================

  @ApiPropertyOptional({
    description: 'Additional notes about merchant configuration',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for updating merchant configuration
 * All fields are optional for PATCH operations
 */
export class UpdateMerchantConfigurationDto extends CreateMerchantConfigurationDto {
  @ApiPropertyOptional({
    description: 'Activate/deactivate merchant configuration',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for merchant configuration response (sensitive fields redacted)
 */
export class MerchantConfigurationResponseDto {
  id: string;
  tenantId: string;

  // Business info
  businessName: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  businessCategory?: string;
  websiteUrl?: string;
  businessAddress?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  contactPersonEmail?: string;

  // MTN Status (credentials not included in response)
  mtnAccountActive: boolean;
  mtnLastVerified?: Date;

  // Airtel Status (credentials not included in response)
  airtelAccountActive: boolean;
  airtelLastVerified?: Date;

  // Bank Account Status (account number redacted)
  bankAccountVerified: boolean;
  bankAccountVerifiedDate?: Date;
  bankName?: string;

  // KYC
  kycStatus: KycStatus;
  kycVerifiedDate?: Date;
  complianceNotes?: string;

  // Webhook
  webhookEnabled: boolean;
  webhookLastTested?: Date;

  // Encryption
  encryptionStatus: string;

  // Rate Limits
  maxDailyCollections: number;
  maxDailyDisbursementAmount?: number;
  maxTransactionAmount?: number;
  approvalThresholdAmount?: number;

  // Audit
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for credential verification request
 */
export class VerifyCredentialsDto {
  @ApiProperty({
    description: 'Provider to verify credentials for',
    enum: ['MTN', 'AIRTEL'],
  })
  @IsEnum(['MTN', 'AIRTEL'])
  provider: 'MTN' | 'AIRTEL';

  @ApiPropertyOptional({
    description: 'Test amount for verification',
    example: 100,
  })
  @IsOptional()
  testAmount?: number;
}

/**
 * DTO for webhook testing
 */
export class TestWebhookDto {
  @ApiProperty({
    description: 'Webhook event type to test',
    example: 'payment.success',
  })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({
    description: 'Test payload to send',
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}

/**
 * DTO for credential verification response
 */
export class VerificationResponseDto {
  @ApiProperty({ description: 'Whether verification was successful', example: true })
  success: boolean;

  @ApiProperty({ description: 'Verification result message', example: 'MTN credentials verified successfully' })
  message: string;
}

/**
 * DTO for webhook test response
 */
export class WebhookTestResponseDto {
  @ApiProperty({ description: 'Whether webhook test was successful', example: true })
  success: boolean;

  @ApiProperty({ description: 'HTTP status code from webhook endpoint', example: 200 })
  statusCode: number;

  @ApiProperty({ description: 'Test result message', example: 'Webhook test successful' })
  message: string;
}
