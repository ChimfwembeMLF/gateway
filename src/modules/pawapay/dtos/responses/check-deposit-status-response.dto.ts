import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

export class CheckDepositStatusResponseDto extends BaseResponseDto {
  @ApiProperty({ example: 'transaction-123' })
  transactionId: string;

  @ApiProperty({ example: 'SUCCESS', description: 'Current deposit status' })
  status: string;

  @ApiProperty({ example: '2026-03-21T12:00:00Z', required: false })
  completedAt?: string;
}
