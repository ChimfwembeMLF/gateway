import { ApiProperty } from '@nestjs/swagger';

export class MTNInfoDto {
  @ApiProperty()
  accountHolderIdType: string;

  @ApiProperty()
  accountHolderId: string;

  @ApiProperty()
  financialIdentificationType: string;
}

export class MTNInfoResponseDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  message?: string;
}

export class FetchClientDetailsDto {
  @ApiProperty()
  phone: string;
}
