import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

export class ResendRefundCallbackResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'transaction-123' })
  transactionId: string;

  @ApiProperty({ example: true })
  resent: boolean;
}
