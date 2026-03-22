import { ApiProperty } from '@nestjs/swagger';
import { BaseResponseDto } from './base-response.dto';

class WalletBalance {
  @ApiProperty({ example: 'ZMW' })
  currency: string;

  @ApiProperty({ example: 10000 })
  balance: number;
}

export class WalletBalancesResponseDto extends BaseResponseDto {
  @ApiProperty({ type: [WalletBalance] })
  balances: WalletBalance[];
}
