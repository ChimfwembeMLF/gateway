import { ApiProperty } from '@nestjs/swagger';

export abstract class AbstractDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
