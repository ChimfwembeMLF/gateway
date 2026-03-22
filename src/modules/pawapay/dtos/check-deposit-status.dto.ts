import { ApiProperty } from '@nestjs/swagger';

export class CheckDepositStatusDto {
  @ApiProperty({ example: 'deposit-transaction-id', description: 'Deposit transaction ID' })
  depositId: string;
}
