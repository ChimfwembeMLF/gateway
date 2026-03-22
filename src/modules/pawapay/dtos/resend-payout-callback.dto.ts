import { ApiProperty } from '@nestjs/swagger';

export class ResendPayoutCallbackDto {
  @ApiProperty({ example: 'payout-transaction-id', description: 'Payout transaction ID' })
  payoutId: string;
}
