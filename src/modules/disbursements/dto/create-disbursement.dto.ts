import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentProvider } from '../../../common/enums/provider.enum';
import { ZambiaNetwork } from 'src/common/enums/zambia-network.enum';

export class CreateDisbursementDto {
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
  recipient: string;

  @ApiProperty({ example: 'Disbursement for invoice' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  recipientName?: string;
}