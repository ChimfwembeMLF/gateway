import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

export class CancelEnqueuedPayoutResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'transaction-123' })
  transactionId: string;

  @ApiProperty({ example: 'CANCELLED' })
  status: string;
}
