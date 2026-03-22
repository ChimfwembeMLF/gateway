import { ApiProperty } from '@nestjs/swagger';

export class CheckRefundStatusDto {
  @ApiProperty({ example: 'refund-transaction-id', description: 'Refund transaction ID' })
  refundId: string;
}
