import { IsEnum, IsUUID, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { BillingPlanType } from '../entities';

export class CreateSubscriptionDto {
  @IsUUID()
  tenantId: string;

  @IsEnum(BillingPlanType)
  planType: BillingPlanType;

  @IsEnum(['MONTHLY', 'ANNUAL'])
  billingFrequency: 'MONTHLY' | 'ANNUAL';

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean = true;

  @IsNumber()
  @IsOptional()
  amountPaid?: number;
}
