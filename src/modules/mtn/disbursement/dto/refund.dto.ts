import { ApiProperty } from '@nestjs/swagger';

export class RefundDto {
  @ApiProperty({ example: '1000' })
  amount: string;
  @ApiProperty({ example: 'UGX' })
  currency: string;
  @ApiProperty({ example: '123456789' })
  externalId: string;
  @ApiProperty({ example: 'Refund for failed transaction' })
  payerMessage: string;
  @ApiProperty({ example: 'Sorry for the inconvenience' })
  payeeNote: string;
  @ApiProperty({ description: 'UUID of the transaction to refund', example: 'b7e6c8e2-1234-4c8a-9b2e-abcdef123456' })
  referenceIdToRefund: string;
}
