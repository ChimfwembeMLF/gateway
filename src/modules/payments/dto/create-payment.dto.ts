import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentProvider } from '../../../common/enums/provider.enum';
export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentProvider, example: 'MTN', description: 'Payment provider (e.g., MTN, AIRTEL, ZAMTEL)' })
  @IsEnum(PaymentProvider)
  @IsNotEmpty()
  provider: PaymentProvider;
  @ApiProperty({ example: 100 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'EUR', default: 'EUR' })
  @IsString()
  @IsOptional()
  currency?: string = 'EUR';

  @ApiProperty({ example: 'INV-20260105-001' })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty({ example: '256771234567' })
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
  
  // ...existing code...
}
