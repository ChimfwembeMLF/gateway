import { ApiPropertyOptional } from '@nestjs/swagger';

export class BaseQueryDto {
  @ApiPropertyOptional()
  page?: number = 1;

  @ApiPropertyOptional()
  pageSize?: number = 10;

  @ApiPropertyOptional()
  sortBy?: string;

  @ApiPropertyOptional()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}
