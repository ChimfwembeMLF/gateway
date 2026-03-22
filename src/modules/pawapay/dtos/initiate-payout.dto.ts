import { ApiProperty } from '@nestjs/swagger';

export class InitiatePayoutDto {
  @ApiProperty({ example: '15', description: 'Amount to payout' })
  amount: string;

  @ApiProperty({ example: 'ZMW', description: 'Currency code' })
  currency: string;

  @ApiProperty({ example: '260763456789', description: 'Recipient phone number' })
  phoneNumber: string;

  @ApiProperty({ example: 'Note of 4 to 22 chars', required: false })
  customerMessage?: string;
}
