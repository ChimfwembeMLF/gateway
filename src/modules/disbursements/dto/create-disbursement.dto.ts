import {
  IsString,
  IsNotEmpty,
  Matches,
  IsPositive,
  IsEnum,
  IsOptional,
  Length,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { WalletType } from 'src/common/enums/wallet-type.enum';
import { TransactionType } from 'src/common/enums/transaction-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payment provider for disbursement
 */
export enum PaymentProvider {
  AIRTEL = 'AIRTEL',
  MTN = 'MTN',
}

/**
 * DTO for creating a new disbursement
 * Represents a request to send money to a customer's mobile wallet (Airtel or MTN)
 */
export class CreateDisbursementDto {
  /**
   * Payment provider to use for this disbursement
   * Determines which mobile money service handles the transaction
   */
  @ApiProperty({
    description: 'Payment provider (AIRTEL or MTN)',
    enum: PaymentProvider,
    example: PaymentProvider.AIRTEL,
  })
  @IsEnum(PaymentProvider)
  @IsNotEmpty()
  provider: PaymentProvider;

  /**
   * Unique idempotency key provided by client
   * Used to prevent duplicate disbursements for the same transaction
   * Format: UUID or custom identifier (max 255 chars)
   */
  @ApiProperty({
    description: 'Client-provided idempotency key for duplicate prevention',
    example: 'order-2024-001-disbursement',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  externalId: string;

  /**
   * Recipient's mobile number (Zambian format without country code)
   * Format: 9-15 digits, typically 0977123456 for Airtel Zambia
   * Country code prefix (+260) should NOT be included
   * Will be normalized (if present, stripped)
   */
  @ApiProperty({
    description: 'Recipient mobile number without country code (e.g., 0977123456)',
    example: '0977123456',
    minLength: 9,
    maxLength: 15,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{9,15}$/, {
    message: 'payeeMsisdn must be 9-15 digits without country code prefix',
  })
  payeeMsisdn: string;

  /**
   * Amount to disburse
   * Must be positive and in the specified currency
   * Decimal precision: 4 places (e.g., 123.45)
   */
  @ApiProperty({
    description: 'Disbursement amount in specified currency',
    example: 500.5,
    type: 'number',
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  amount: number;

  /**
   * ISO 4217 currency code
   * Default: ZMW (Zambian Kwacha)
   * Must match tenant's supported currencies
   */
  @ApiPropertyOptional({
    description: 'ISO 4217 currency code',
    example: 'ZMW',
    default: 'ZMW',
    minLength: 3,
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string = 'ZMW';

  /**
   * Business reference for this disbursement
   * Used for reconciliation and customer communication
   * Example: order ID, invoice number, or transaction reference
   */
  @ApiProperty({
    description: 'Business reference for reconciliation',
    example: 'INV-2024-001',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  reference: string;

  /**
   * 4-digit PIN for Airtel wallet authorization
   * Will be encrypted before transmission to Airtel
   * Must be exactly 4 digits
   */
  @ApiProperty({
    description: '4-digit PIN for wallet authorization (will be encrypted)',
    example: '1234',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}$/, {
    message: 'pin must be exactly 4 digits',
  })
  pin: string;

  /**
   * Recipient wallet type
   * Default: NORMAL (standard consumer wallet)
   * Other types: SALARY, MERCHANT, DISBURSEMENT
   */
  @ApiPropertyOptional({
    description: 'Recipient wallet type',
    enum: WalletType,
    default: WalletType.NORMAL,
  })
  @IsOptional()
  @IsEnum(WalletType)
  walletType?: WalletType = WalletType.NORMAL;

  /**
   * Transaction type classification
   * Default: B2C (Business-to-Consumer)
   * Other types: B2B, G2C, B2G, SALARY, etc.
   */
  @ApiPropertyOptional({
    description: 'Transaction type classification',
    enum: TransactionType,
    default: TransactionType.B2C,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType = TransactionType.B2C;
}
