import { ApiProperty } from '@nestjs/swagger';

export class PayeeDto {
  @ApiProperty({ enum: ['MSISDN', 'EMAIL', 'PARTY_CODE'], example: 'MSISDN' })
  partyIdType: string;
  @ApiProperty({ example: '256772123456' })
  partyId: string;
}

export class DepositDto {
  @ApiProperty({ example: '1000' })
  amount: string;
  @ApiProperty({ example: 'UGX' })
  currency: string;
  @ApiProperty({ example: '123456789' })
  externalId: string;
  @ApiProperty({ type: () => PayeeDto, example: { partyIdType: 'MSISDN', partyId: '256772123456' } })
  payee: PayeeDto;
  @ApiProperty({ example: 'Deposit for services' })
  payerMessage: string;
  @ApiProperty({ example: 'Thank you' })
  payeeNote: string;
}
