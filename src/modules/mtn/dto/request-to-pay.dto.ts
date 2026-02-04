import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { AbstractDto } from '../../../common/dtos/abstract.dto';

export class RequestToPayDto extends AbstractDto {
  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ default: 'ZMW', enum: ['ZMW'], description: 'Currency must be ZMW (Zambian Kwacha)' })
  @IsString()
  currency: string;

  @ApiProperty()
  @IsString()
  externalId: string;

  @ApiProperty()
  @IsString()
  payer: string;

  @ApiProperty()
  @IsString()
  payerMessage: string;

  @ApiProperty()
  @IsString()
  payeeNote: string;
}
