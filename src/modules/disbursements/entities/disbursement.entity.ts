import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DisbursementStatus } from 'src/common/enums/disbursement-status.enum';
import { WalletType } from 'src/common/enums/wallet-type.enum';
import { TransactionType } from 'src/common/enums/transaction-type.enum';
import { Tenant } from '../../tenant/entities/tenant.entity';

/**
 * Payment provider enum
 */
export enum PaymentProvider {
  AIRTEL = 'AIRTEL',
  MTN = 'MTN',
}

/**
 * Disbursement Entity
 * Represents a payout transaction from business to customer mobile wallet (Airtel or MTN)
 */
@Entity('disbursements')
@Index(['tenantId'])
@Index(['tenantId', 'externalId'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
@Index(['payeeMsisdn'])
@Index(['provider'])
export class Disbursement {
  /**
   * Unique disbursement identifier
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Payment provider for this disbursement (AIRTEL or MTN)
   */
  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.AIRTEL,
  })
  provider: PaymentProvider;

  /**
   * Tenant ID for multi-tenancy isolation
   */
  @Column({ nullable: false })
  tenantId: string;

  /**
   * Relationship to Tenant
   */
  @ManyToOne(() => Tenant, (tenant) => tenant.disbursements)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  /**
   * Client-provided idempotency key/transaction reference
   * Used to prevent duplicate disbursements
   */
  @Column({ nullable: false })
  externalId: string;

  /**
   * Recipient's mobile number (without country code)
   * Format: 9-15 digits (validated during creation)
   */
  @Column({ nullable: false, length: 20 })
  payeeMsisdn: string;

  /**
   * Wallet type for recipient categorization
   * Airtel may handle SALARY wallets differently than NORMAL
   */
  @Column({
    type: 'enum',
    enum: WalletType,
    default: WalletType.NORMAL,
  })
  walletType: WalletType;

  /**
   * Disbursement amount in specified currency
   * Must be positive, validated by database CHECK constraint
   */
  @Column({
    type: 'decimal',
    precision: 19,
    scale: 4,
    nullable: false,
  })
  amount: string;

  /**
   * ISO 4217 currency code
   * Typically 'ZMW' for Zambian Kwacha
   */
  @Column({ nullable: false, default: 'ZMW', length: 3 })
  currency: string;

  /**
   * Business reference for this disbursement
   * Used for reconciliation and customer communication
   */
  @Column({ nullable: false, length: 255 })
  reference: string;

  /**
   * RSA-OAEP encrypted 4-digit PIN (base64-encoded)
   * Encryption key from Airtel configuration
   * PIN is not stored unencrypted for security
   */
  @Column({ type: 'text', nullable: false })
  encryptedPin: string;

  /**
   * Transaction type classification
   * Used by Airtel for routing and fee calculation
   */
  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.B2C,
  })
  transactionType: TransactionType;

  /**
   * Current status of the disbursement
   * Tracks lifecycle: PENDING → PROCESSING → SUCCESS/FAILED
   */
  @Column({
    type: 'enum',
    enum: DisbursementStatus,
    default: DisbursementStatus.PENDING,
  })
  status: DisbursementStatus;

  /**
   * Airtel-generated reference ID for this transaction
   * Populated from Airtel API response
   */
  @Column({ nullable: true, length: 255 })
  airtelReferenceId?: string;

  /**
   * Airtel Money transaction ID
   * Unique transaction identifier from Airtel system
   */
  @Column({ nullable: true, length: 255 })
  airtelMoneyId?: string;

  /**
   * Error code if disbursement failed
   * Maps to Airtel error codes (e.g., 'INSUFFICIENT_FUNDS')
   */
  @Column({ nullable: true, length: 50 })
  errorCode?: string;

  /**
   * Human-readable error message
   * Describes why the disbursement failed or timed out
   */
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  /**
   * Record creation timestamp
   * Set automatically by TypeORM
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Last update timestamp
   * Set automatically by TypeORM, updated on each change
   */
  @UpdateDateColumn()
  updatedAt: Date;
}
