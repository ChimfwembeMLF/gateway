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

  @Column({ nullable: false, unique: true })
  tenantId: string;

  @OneToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;


  // BUSINESS INFORMATION
  @Column({ type: 'varchar', length: 255, nullable: false })
  businessName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  businessRegistrationNumber?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  taxId?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  businessCategory?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  websiteUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  businessAddress?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactPersonName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactPersonPhone?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactPersonEmail?: string;

  // MTN Mobile Money Credentials
  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnCollectionSubscriptionKey?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnCollectionApiKey?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnCollectionXReferenceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnCollectionTargetEnvironment?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnDisbursementSubscriptionKey?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnDisbursementApiKey?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnDisbursementXReferenceId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnDisbursementTargetEnvironment?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mtnAccountHolder?: string;

  @Column({ type: 'boolean', default: false })
  mtnAccountActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  mtnLastVerified?: Date;

  // Airtel Money Credentials
  @Column({ type: 'varchar', length: 255, nullable: true })
  airtelClientId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  airtelClientSecret?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  airtelSigningSecret?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  airtelEncryptionPublicKey?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  airtelEnvironment?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  airtelCountry?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  airtelCurrency?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  airtelMerchantId?: string;

  @Column({ type: 'boolean', default: false })
  airtelAccountActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  airtelLastVerified?: Date;

  // Bank Account Details
  @Column({ type: 'varchar', length: 100, nullable: true })
  bankAccountHolder?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankAccountNumber?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankAccountType?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bankName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankBranchCode?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankSwiftCode?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  bankAccountCurrency?: string;

  @Column({ type: 'boolean', default: false })
  bankAccountVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  bankAccountVerifiedDate?: Date;

  // KYC
  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  kycStatus: KycStatus;

  @Column({ type: 'timestamp', nullable: true })
  kycVerifiedDate?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  complianceNotes?: string;

  // Director Info
  @Column({ type: 'varchar', length: 100, nullable: true })
  directorName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  directorIdNumber?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  directorIdType?: string;

  @Column({ type: 'jsonb', nullable: true })
  beneficialOwnerInfo?: any;

  // Limits
  @Column({ type: 'int', default: 0 })
  maxDailyCollections: number;

  @Column({ type: 'decimal', nullable: true })
  maxDailyDisbursementAmount?: number;

  @Column({ type: 'decimal', nullable: true })
  maxTransactionAmount?: number;

  @Column({ type: 'decimal', nullable: true })
  approvalThresholdAmount?: number;

  // Encryption status
  @Column({ type: 'enum', enum: EncryptionStatus, default: EncryptionStatus.UNENCRYPTED })
  encryptionStatus: EncryptionStatus;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Webhook configuration
  @Column({ type: 'varchar', length: 500, nullable: true })
  webhookUrl?: string;

  @Column({ type: 'text', nullable: true })
  webhookSecret?: string;

  @Column({ type: 'jsonb', default: [] })
  webhookEvents?: string[];

  @Column({ type: 'boolean', default: true })
  webhookEnabled: boolean;
  @Column({ type: 'timestamp', nullable: true })
  webhookLastTested?: Date;

  // Payout accounts for each MNO (example: MTN, Airtel)
  @Column({ type: 'jsonb', nullable: true })
  payoutAccounts?: {
    [mno: string]: {
      accountNumber?: string;
      accountName?: string;
      bankName?: string;
      extra?: Record<string, any>;
    };
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
