import { ApiProperty } from '@nestjs/swagger';

export class ValidateAccountHolderStatusDto {
  @ApiProperty({ example: true, description: 'True if account holder is active, false otherwise.' })
  result: boolean;
}
