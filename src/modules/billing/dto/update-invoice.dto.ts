import { IsEnum, IsOptional, IsString, IsNumber, IsDateString, Min } from 'class-validator';
import { InvoiceStatus } from '../entities';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentTransactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
