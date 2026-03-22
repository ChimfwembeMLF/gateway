import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

export class InitiatePayoutResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'transaction-123', description: 'pawaPay transaction ID' })
  transactionId: string;

  @ApiProperty({ example: 'PENDING', description: 'Initial status' })
  status: string;
}
