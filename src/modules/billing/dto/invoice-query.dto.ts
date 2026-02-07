import { IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { InvoiceStatus } from '../entities';

export class InvoiceQueryDto {
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
