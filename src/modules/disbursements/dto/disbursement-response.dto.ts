import { ApiProperty } from '@nestjs/swagger';
import { DisbursementStatus } from 'src/common/enums/disbursement-status.enum';
import { WalletType } from 'src/common/enums/wallet-type.enum';
import { TransactionType } from 'src/common/enums/transaction-type.enum';
import { PaymentProvider } from './create-disbursement.dto';

/**
 * DTO for disbursement API responses
 * Represents the current state of a disbursement transaction
 */
export class DisbursementResponseDto {
  /**
   * Unique disbursement identifier (UUID)
   */
  @ApiProperty({
    description: 'Unique disbursement identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  /**
   * Payment provider used for this disbursement
   */
  @ApiProperty({
    description: 'Payment provider that handled the transaction',
    enum: PaymentProvider,
    example: PaymentProvider.AIRTEL,
  })
  provider: PaymentProvider;

  /**
   * Tenant ID (for reference, typically hidden in public API)
   */
  @ApiProperty({
    description: 'Tenant owning this disbursement',
    example: 'tenant-001',
  })
  tenantId: string;

  /**
   * Client-provided idempotency key
   */
  @ApiProperty({
    description: 'Client-provided idempotency key',
    example: 'order-2024-001-disbursement',
  })
  externalId: string;

  /**
   * Recipient's mobile number (without country code)
   */
  @ApiProperty({
    description: 'Recipient mobile number',
    example: '0977123456',
  })
  payeeMsisdn: string;

  /**
   * Wallet type
   */
  @ApiProperty({
    description: 'Recipient wallet type',
    enum: WalletType,
    example: WalletType.NORMAL,
  })
  walletType: WalletType;

  /**
   * Disbursement amount
   */
  @ApiProperty({
    description: 'Disbursement amount',
    example: '500.50',
    type: 'string',
  })
  amount: string;

  /**
   * Currency code
   */
  @ApiProperty({
    description: 'Currency code',
    example: 'ZMW',
  })
  currency: string;

  /**
   * Business reference
   */
  @ApiProperty({
    description: 'Business reference for reconciliation',
    example: 'INV-2024-001',
  })
  reference: string;

  /**
   * Transaction type
   */
  @ApiProperty({
    description: 'Transaction type classification',
    enum: TransactionType,
    example: TransactionType.B2C,
  })
  transactionType: TransactionType;

  /**
   * Current status
   */
  @ApiProperty({
    description: 'Current disbursement status',
    enum: DisbursementStatus,
    example: DisbursementStatus.SUCCESS,
  })
  status: DisbursementStatus;

  /**
   * Airtel-generated reference ID (if available)
   */
  @ApiProperty({
    description: 'Airtel-generated reference ID',
    example: 'AIRTEL-REF-12345',
    nullable: true,
  })
  airtelReferenceId?: string;

  /**
   * Airtel Money transaction ID (if available)
   */
  @ApiProperty({
    description: 'Airtel Money transaction ID',
    example: 'MONEY-12345-67890',
    nullable: true,
  })
  airtelMoneyId?: string;

  /**
   * Error code (if disbursement failed)
   */
  @ApiProperty({
    description: 'Error code if disbursement failed',
    example: 'INVALID_MSISDN',
    nullable: true,
  })
  errorCode?: string;

  /**
   * Error message (if disbursement failed)
   */
  @ApiProperty({
    description: 'Human-readable error message',
    example: 'The provided MSISDN is invalid or inactive',
    nullable: true,
  })
  errorMessage?: string;

  /**
   * Record creation timestamp (ISO 8601)
   */
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-02-06T10:30:00Z',
  })
  createdAt: Date;

  /**
   * Last update timestamp (ISO 8601)
   */
  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-02-06T10:31:00Z',
  })
  updatedAt: Date;
}
