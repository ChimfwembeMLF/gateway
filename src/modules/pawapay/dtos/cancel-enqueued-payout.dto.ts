import { ApiProperty } from '@nestjs/swagger';

export class CancelEnqueuedPayoutDto {
  @ApiProperty({ example: 'payout-transaction-id', description: 'Payout transaction ID' })
  payoutId: string;
}
