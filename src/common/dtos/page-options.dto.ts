import { ApiProperty } from '@nestjs/swagger';

export class PageOptionsDto {
  @ApiProperty({ example: 1, required: false })
  page?: number = 1;

  @ApiProperty({ example: 10, required: false })
  pageSize?: number = 10;

  @ApiProperty({ example: 'createdAt', required: false })
  sortBy?: string;

  @ApiProperty({ example: 'DESC', required: false })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
