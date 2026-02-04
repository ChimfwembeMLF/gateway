import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PaymentStatusDto {
  @ApiProperty()
  @IsString()
  paymentId: string;
}
