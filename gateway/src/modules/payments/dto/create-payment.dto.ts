import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';
import { AbstractDto } from '../../../common/dtos/abstract.dto';

export class CreatePaymentDto extends AbstractDto {
  @ApiProperty({ description: 'Payment provider (e.g., mtn, airtel, zamtel)' })
  @IsString()
  @IsNotEmpty()
  provider: string;
  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ default: 'EUR' })
  @IsString()
  @IsOptional()
  currency?: string = 'EUR';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  payer: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  payerMessage?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  payeeNote?: string;
  
  @ApiProperty({ required: false, description: 'Bearer token for provider (if required)' })
  @IsString()
  @IsOptional()
  bearerToken?: string;
  
  @ApiProperty({ required: false, description: 'Transaction ID for provider (if required)' })
  @IsString()
  @IsOptional()
  transactionId?: string;
}
