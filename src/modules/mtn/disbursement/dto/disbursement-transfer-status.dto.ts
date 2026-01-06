import { ApiProperty } from '@nestjs/swagger';

export class DisbursementTransferStatusDto {
  @ApiProperty({ example: 'reference-uuid', description: 'Reference ID for the transfer' })
  referenceId: string;

  @ApiProperty({ example: 'SUCCESSFUL', description: 'Status of the transfer' })
  status: string;

  @ApiProperty({ example: '2026-01-06T12:00:00Z', description: 'Timestamp of the status update' })
  updatedAt: string;

  @ApiProperty({ example: 'Payment for services', description: 'Narration or reason for payment' })
  narration: string;
}
