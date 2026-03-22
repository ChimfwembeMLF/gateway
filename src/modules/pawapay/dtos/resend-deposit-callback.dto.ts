import { ApiProperty } from '@nestjs/swagger';

export class ResendDepositCallbackDto {
  @ApiProperty({ example: 'deposit-transaction-id', description: 'Deposit transaction ID' })
  depositId: string;
}
