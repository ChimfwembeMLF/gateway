import { ApiProperty } from '@nestjs/swagger';

export class CreateDisbursementTransferDto {
  @ApiProperty({ example: '256772123456', description: 'Payee mobile number' })
  payee: string;

  @ApiProperty({ example: 10000, description: 'Amount to transfer' })
  amount: number;

  @ApiProperty({ example: 'UGX', description: 'Currency code' })
  currency: string;

  @ApiProperty({ example: 'Payment for services', description: 'Narration or reason for payment' })
  narration: string;

  @ApiProperty({ example: 'reference-uuid', description: 'Unique reference for the transaction' })
  referenceId: string;
}
