import { IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DisbursementStatus } from 'src/common/enums/disbursement-status.enum';

/**
 * DTO for listing/filtering disbursements
 * Supports pagination and filtering by status and date range
 */
export class ListDisbursementsQueryDto {
  /**
   * Page number (1-indexed)
   * Default: 1
   */
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  /**
   * Items per page
   * Default: 20, Max: 100
   */
  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  /**
   * Filter by status
   * If not provided, returns all disbursements regardless of status
   */
  @ApiPropertyOptional({
    description: 'Filter by disbursement status',
    enum: DisbursementStatus,
  })
  @IsOptional()
  @IsEnum(DisbursementStatus)
  status?: DisbursementStatus;

  /**
   * Start date for filtering (ISO 8601 format)
   * Inclusive: disbursements created on or after this date
   */
  @ApiPropertyOptional({
    description: 'Start date for filtering (ISO 8601)',
    example: '2024-02-01T00:00:00Z',
  })
  @IsOptional()
  startDate?: string;

  /**
   * End date for filtering (ISO 8601 format)
   * Inclusive: disbursements created on or before this date
   */
  @ApiPropertyOptional({
    description: 'End date for filtering (ISO 8601)',
    example: '2024-02-06T23:59:59Z',
  })
  @IsOptional()
  endDate?: string;
}
