import { ApiProperty } from '@nestjs/swagger';

export class CheckPayoutStatusDto {
  @ApiProperty({ example: 'payout-transaction-id', description: 'Payout transaction ID' })
  payoutId: string;
}
