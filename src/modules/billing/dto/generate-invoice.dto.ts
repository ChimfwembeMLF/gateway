import { IsUUID, IsDateString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class GenerateInvoiceDto {
  @IsUUID()
  tenantId: string;

  @IsDateString()
  billingPeriodStart: string;

  @IsDateString()
  billingPeriodEnd: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}
