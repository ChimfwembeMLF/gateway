import { IsString, IsNumber, IsEnum, IsOptional, Matches, Min } from 'class-validator';
import { DisbursementType } from '../entities/disbursement.entity';

export class PartyDto {
  @IsEnum(['MSISDN', 'EMAIL', 'ID'])
  partyIdType: string;

  @IsString()
  partyId: string;
}

export class CreateTransferDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency: string;

  @IsString()
  externalId: string;

  @IsOptional()
  @IsString()
  payerMessage?: string;

  @IsOptional()
  @IsString()
  payeeNote?: string;

  payee: PartyDto;
}

export class CreateDepositDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency: string;

  @IsString()
  externalId: string;

  @IsOptional()
  @IsString()
  payerMessage?: string;

  @IsOptional()
  @IsString()
  payeeNote?: string;

  payee: PartyDto;
}

export class CreateRefundDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/)
  currency: string;

  @IsString()
  externalId: string;

  @IsString()
  referenceIdToRefund: string; // Original transaction ID to refund

  @IsOptional()
  @IsString()
  payerMessage?: string;

  @IsOptional()
  @IsString()
  payeeNote?: string;
}

export class DisbursementStatusDto {
  id: string;
  type: DisbursementType;
  status: string;
  amount: number;
  currency: string;
  externalId: string;
  mtnTransactionId?: string;
  errorDetails?: any;
  createdAt: Date;
  completedAt?: Date;
  retryCount: number;
}
