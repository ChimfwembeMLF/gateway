import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';

/**
 * Encryption status for sensitive fields
 */
export enum EncryptionStatus {
  ENCRYPTED = 'ENCRYPTED',
  UNENCRYPTED = 'UNENCRYPTED',
  NEEDS_ROTATION = 'NEEDS_ROTATION',
}

/**
 * KYC verification status
 */
export enum KycStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  NEEDS_UPDATE = 'NEEDS_UPDATE',
}

/**
 * Merchant Configuration Entity
 * Stores all merchant-specific credentials, KYC data, and business details
 * All sensitive fields (credentials, bank details) are encrypted at rest
 */
@Entity('merchant_configurations')
@Index(['tenantId'], { unique: true })
@Index(['kycStatus'])
@Index(['createdAt'])
export class MerchantConfiguration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tenant/Merchant identifier
   * One-to-one relationship with Tenant
   */
  @Column({ nullable: false, unique: true })
  tenantId: string;

  @OneToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  // ============================================================================
  // BUSINESS INFORMATION
  // ============================================================================

  /**
   * Legal business name
   */
  @Column({ type: 'varchar', length: 255, nullable: false })
  businessName: string;

  /**
   * Business registration number
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  businessRegistrationNumber: string;

  /**
   * Tax ID/VAT number
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  taxId: string;

  /**
   * Business category/industry
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  businessCategory: string;

  /**
   * Business website URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  websiteUrl: string;

  /**
   * Physical business address (encrypted)
   */
  @Column({ type: 'text', nullable: true })
  businessAddress: string;

  /**
   * Primary contact person name
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactPersonName: string;

  /**
   * Primary contact phone
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  contactPersonPhone: string;

  /**
   * Primary contact email
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactPersonEmail: string;

  // ============================================================================
  // MTN CREDENTIALS (Encrypted)
  // ============================================================================

  /**
   * MTN API subscription key for collection
   * Encrypted at rest
   */
  @Column({ type: 'text', nullable: true })
  mtnCollectionSubscriptionKey: string;

  /**
   * MTN API key for collection
   * Encrypted at rest
   */
  @Column({ type: 'text', nullable: true })
  mtnCollectionApiKey: string;

  /**
   * MTN collection X-Reference-ID
   * Unique identifier per merchant for MTN
   * Encrypted at rest
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnCollectionXReferenceId: string;

  /**
   * MTN target environment (sandbox, production)
   */
  @Column({ type: 'varchar', length: 50, default: 'sandbox' })
  mtnCollectionTargetEnvironment: string;

  /**
   * MTN API subscription key for disbursement
   * Encrypted at rest
   */
  @Column({ type: 'text', nullable: true })
  mtnDisbursementSubscriptionKey: string;

  /**
   * MTN API key for disbursement
   * Encrypted at rest
   */
  @Column({ type: 'text', nullable: true })
  mtnDisbursementApiKey: string;

  /**
   * MTN disbursement X-Reference-ID
   * Encrypted at rest
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnDisbursementXReferenceId: string;

  /**
   * MTN target environment for disbursement
   */
  @Column({ type: 'varchar', length: 50, default: 'sandbox' })
  mtnDisbursementTargetEnvironment: string;

  /**
   * MTN account holder name (for verification)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnAccountHolder: string;

  /**
   * MTN account status
   */
  @Column({ type: 'boolean', default: false })
  mtnAccountActive: boolean;

  /**
   * MTN account last verified date
   */
  @Column({ type: 'timestamp', nullable: true })
  mtnLastVerified: Date;

  // ============================================================================
  // AIRTEL CREDENTIALS (Encrypted)
  // ============================================================================

  /**
   * Airtel OAuth2 Client ID
   * Encrypted at rest
   */
  @Column({ type: 'text', nullable: true })
  airtelClientId: string;

  /**
   * Airtel OAuth2 Client Secret
   * Encrypted at rest
   */
  @Column({ type: 'text', nullable: true })
  airtelClientSecret: string;

  /**
   * Airtel Signing Secret (HMAC key)
   * Used for message signing
   * Encrypted at rest
   */
  @Column({ type: 'text', nullable: true })
  airtelSigningSecret: string;

  /**
   * Airtel RSA Public Key for encryption
   * Used to encrypt PIN and sensitive data
   * Encrypted at rest
   */
  @Column({ type: 'text', nullable: true })
  airtelEncryptionPublicKey: string;

  /**
   * Airtel environment (staging, production)
   */
  @Column({ type: 'varchar', length: 50, default: 'staging' })
  airtelEnvironment: string;

  /**
   * Airtel country code (e.g., ZM)
   */
  @Column({ type: 'varchar', length: 2, default: 'ZM' })
  airtelCountry: string;

  /**
   * Airtel default currency
   */
  @Column({ type: 'varchar', length: 3, default: 'ZMW' })
  airtelCurrency: string;

  /**
   * Airtel merchant account ID/reference
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  airtelMerchantId: string;

  /**
   * Airtel account status
   */
  @Column({ type: 'boolean', default: false })
  airtelAccountActive: boolean;

  /**
   * Airtel account last verified date
   */
  @Column({ type: 'timestamp', nullable: true })
  airtelLastVerified: Date;

  // ============================================================================
  // BANK ACCOUNT INFORMATION (Encrypted)
  // ============================================================================

  /**
   * Bank account holder name
   * Encrypted at rest
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  bankAccountHolder: string;

  /**
   * Bank account number
   * Encrypted at rest
   */
  @Column({ type: 'text', nullable: true })
  bankAccountNumber: string;

  /**
   * Bank account type (checking, savings)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  bankAccountType: string;

  /**
   * Bank name
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName: string;

  /**
   * Bank branch code
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  bankBranchCode: string;

  /**
   * SWIFT/BIC code
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  bankSwiftCode: string;

  /**
   * Currency of bank account
   */
  @Column({ type: 'varchar', length: 3, default: 'ZMW' })
  bankAccountCurrency: string;

  /**
   * Bank account verification status
   */
  @Column({ type: 'boolean', default: false })
  bankAccountVerified: boolean;

  /**
   * Bank account last verified date
   */
  @Column({ type: 'timestamp', nullable: true })
  bankAccountVerifiedDate: Date;

  // ============================================================================
  // KYC & COMPLIANCE INFORMATION
  // ============================================================================

  /**
   * KYC verification status
   */
  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  kycStatus: KycStatus;

  /**
   * KYC submission date
   */
  @Column({ type: 'timestamp', nullable: true })
  kycSubmittedDate: Date;

  /**
   * KYC verification date
   */
  @Column({ type: 'timestamp', nullable: true })
  kycVerifiedDate: Date;

  /**
   * KYC rejection reason (if rejected)
   */
  @Column({ type: 'text', nullable: true })
  kycRejectionReason: string;

  /**
   * Director/Owner name
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  directorName: string;

  /**
   * Director/Owner ID number (encrypted)
   */
  @Column({ type: 'text', nullable: true })
  directorIdNumber: string;

  /**
   * Director/Owner ID type (passport, national ID, etc.)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  directorIdType: string;

  /**
   * Beneficial owner information (encrypted)
   */
  @Column({ type: 'text', nullable: true })
  beneficialOwnerInfo: string;

  /**
   * Compliance notes
   */
  @Column({ type: 'text', nullable: true })
  complianceNotes: string;

  // ============================================================================
  // WEBHOOK CONFIGURATION
  // ============================================================================

  /**
   * Webhook URL for payment notifications
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  webhookUrl: string;

  /**
   * Webhook signature key for request verification
   * Encrypted at rest
   */
  @Column({ type: 'text', nullable: true })
  webhookSecret: string;

  /**
   * Webhook events to subscribe to (JSON array)
   * Example: ["payment.success", "payment.failed", "disbursement.complete"]
   */
  @Column({ type: 'jsonb', default: [] })
  webhookEvents: string[];

  /**
   * Webhook is active/enabled
   */
  @Column({ type: 'boolean', default: true })
  webhookEnabled: boolean;

  /**
   * Webhook last tested date
   */
  @Column({ type: 'timestamp', nullable: true })
  webhookLastTested: Date;

  // ============================================================================
  // ENCRYPTION & SECURITY
  // ============================================================================

  /**
   * Encryption status of sensitive fields
   */
  @Column({
    type: 'enum',
    enum: EncryptionStatus,
    default: EncryptionStatus.UNENCRYPTED,
  })
  encryptionStatus: EncryptionStatus;

  /**
   * Key version used for encryption (for key rotation)
   */
  @Column({ type: 'int', default: 1 })
  encryptionKeyVersion: number;

  /**
   * Date when credentials were last rotated
   */
  @Column({ type: 'timestamp', nullable: true })
  credentialsRotatedDate: Date;

  // ============================================================================
  // RATE LIMITS & CONFIGURATION
  // ============================================================================

  /**
   * Maximum daily collection requests
   */
  @Column({ type: 'int', default: 10000 })
  maxDailyCollections: number;

  /**
   * Maximum daily disbursement amount
   */
  @Column({ type: 'decimal', precision: 19, scale: 2, nullable: true })
  maxDailyDisbursementAmount: number;

  /**
   * Single transaction maximum amount
   */
  @Column({ type: 'decimal', precision: 19, scale: 2, nullable: true })
  maxTransactionAmount: number;

  /**
   * Require approval for transactions above threshold
   */
  @Column({ type: 'decimal', precision: 19, scale: 2, nullable: true })
  approvalThresholdAmount: number;

  // ============================================================================
  // AUDIT & TIMESTAMPS
  // ============================================================================

  /**
   * Notes about merchant configuration
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * Is the merchant configuration active
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Last configuration update by user ID
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  lastUpdatedBy: string;

  /**
   * Record creation timestamp
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Record last update timestamp
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Soft delete timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;
}
