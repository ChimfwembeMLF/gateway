import { ApiProperty } from '@nestjs/swagger';

class AccountDetails {
  @ApiProperty({ example: 'MTN_MOMO_ZMB', description: 'Provider code' })
  provider: string;

  @ApiProperty({ example: '260763456789', description: 'Phone number' })
  phoneNumber: string;
}

class Payer {
  @ApiProperty({ example: 'MMO', description: 'Payer type' })
  type: string;

  @ApiProperty({ type: AccountDetails })
  accountDetails: AccountDetails;
}

class MetadataItem {
  @ApiProperty({ example: 'ORD-123456789', required: false })
  orderId?: string;

  @ApiProperty({ example: 'customer@email.com', required: false })
  customerId?: string;

  @ApiProperty({ example: true, required: false })
  isPII?: boolean;
}

class BulkPayoutItem {
  @ApiProperty({ example: '15', description: 'Amount to payout' })
  amount: string;

  @ApiProperty({ example: 'ZMW', description: 'Currency code' })
  currency: string;

  @ApiProperty({ example: 'generated-uuid', description: 'Payout ID (UUID)' })
  payoutId: string;

  @ApiProperty({ type: Payer })
  payer: Payer;

  @ApiProperty({ example: '3c', required: false })
  preAuthorisationCode?: string;

  @ApiProperty({ example: 'INV-123456', required: false })
  clientReferenceId?: string;

  @ApiProperty({ example: 'Note of 4 to 22 chars', required: false })
  customerMessage?: string;

  @ApiProperty({ type: [MetadataItem], required: false })
  metadata?: MetadataItem[];
}

export class InitiateBulkPayoutsDto {
  @ApiProperty({ type: [BulkPayoutItem] })
  payouts: BulkPayoutItem[];
}
