import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

class BulkPayoutResult {
  @ApiProperty({ example: 'transaction-123' })
  transactionId: string;

  @ApiProperty({ example: 'PENDING' })
  status: string;
}

export class InitiateBulkPayoutsResponseDto extends BaseResponseDto {
  @ApiProperty({ type: [BulkPayoutResult] })
  results: BulkPayoutResult[];
}
