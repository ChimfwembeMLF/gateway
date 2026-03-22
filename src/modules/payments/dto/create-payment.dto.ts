import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentProvider } from '../../../common/enums/provider.enum';
import { PaymentStatus } from '../entities/payment.entity';
import { ZambiaNetwork } from 'src/common/enums/zambia-network.enum';

export class CreatePaymentDto {
  // Provider is now always pawaPay; field can be omitted or defaulted
  @ApiProperty({ enum: PaymentProvider, example: 'PAWAPAY', description: 'Payment provider (always pawaPay)' })
  @IsEnum(PaymentProvider)
  @IsOptional()
  provider: PaymentProvider = PaymentProvider.PAWAPAY;

  @ApiProperty({ enum: ZambiaNetwork, example: 'MTN', description: 'Target MNO network for Zambia (MTN, AIRTEL, ZAMTEL)' })
  @IsEnum(ZambiaNetwork)
  @IsNotEmpty()
  network: ZambiaNetwork;

  @ApiProperty({ example: 100 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'ZMW', default: 'ZMW' })
  @IsString()
  @IsOptional()
  currency?: string = 'ZMW';

  @ApiProperty({ example: 'INV-20260105-001' })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty({ example: '260765725317' })
  @IsString()
  @IsNotEmpty()
  payer: string;

  @ApiProperty({ example: 'Payment for invoice' })
  @IsString()
  @IsOptional()
  payerMessage?: string;

  @ApiProperty({ example: 'Thank you' })
  @IsString()
  @IsOptional()
  payeeNote?: string;

  @ApiProperty({ enum: PaymentStatus, example: 'PENDING', description: 'Payment status' })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus = PaymentStatus.PENDING;

  @ApiProperty({ example: 'provider-transaction-id', description: 'Provider transaction ID' })
  @IsString()
  @IsOptional()
  providerTransactionId?: string;

  @ApiProperty({ type: [Object], description: 'Additional metadata for extensibility', required: false })
  @IsOptional()
  metadata?: Array<Record<string, any>> = [];

  @ApiProperty({ example: '3c', required: false })
  @IsString()
  @IsOptional()
  preAuthorisationCode?: string = '';

  @ApiProperty({ example: 'INV-123456', required: false })
  @IsString()
  @IsOptional()
  clientReferenceId?: string;
}
