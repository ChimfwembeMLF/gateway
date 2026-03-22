import { ApiProperty } from '@nestjs/swagger';

export class ResendRefundCallbackDto {
  @ApiProperty({ example: 'refund-transaction-id', description: 'Refund transaction ID' })
  refundId: string;
}
