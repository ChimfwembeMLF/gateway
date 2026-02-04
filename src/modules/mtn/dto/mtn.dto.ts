import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, IsObject, IsBoolean } from 'class-validator';
import { MtnErrorReasonCode, MtnRequestToPayStatus, MtnPartyIdType } from './mtn.enums';

export class PartyDto {
  @ApiProperty({ enum: MtnPartyIdType })
  @IsEnum(MtnPartyIdType)
  partyIdType: MtnPartyIdType;

  @ApiProperty()
  @IsString()
  partyId: string;
}

export class RequestToPayDto {
  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty({ description: 'ISO4217 Currency' })
  @IsString()
  currency: string;

  @ApiProperty()
  @IsString()
  externalId: string;

  @ApiProperty({ type: PartyDto })
  @IsObject()
  payer: PartyDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  payerMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  payeeNote?: string;
}

export class ErrorReasonDto {
  @ApiProperty({ enum: MtnErrorReasonCode })
  @IsEnum(MtnErrorReasonCode)
  code: MtnErrorReasonCode;

  @ApiProperty()
  @IsString()
  message: string;
}

export class RequestToPayResultDto {
  @ApiProperty()
  @IsString()
  amount: string;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  financialTransactionId?: string;

  @ApiProperty()
  @IsString()
  externalId: string;

  @ApiProperty({ type: PartyDto })
  @IsObject()
  payer: PartyDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  payerMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  payeeNote?: string;

  @ApiProperty({ enum: MtnRequestToPayStatus })
  @IsEnum(MtnRequestToPayStatus)
  status: MtnRequestToPayStatus;

  @ApiProperty({ required: false, type: () => ErrorReasonDto })
  @IsOptional()
  @IsObject()
  reason?: ErrorReasonDto;
}
