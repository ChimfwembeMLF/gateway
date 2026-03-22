import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

export class InitiateRefundResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'transaction-123', description: 'pawaPay refund transaction ID' })
  transactionId: string;

  @ApiProperty({ example: 'PENDING', description: 'Initial status' })
  status: string;
}
