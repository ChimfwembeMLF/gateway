import { IsEnum, IsBoolean, IsOptional, IsNumber } from 'class-validator';
import { BillingPlanType } from '../entities';

export class UpdateSubscriptionDto {
  @IsEnum(BillingPlanType)
  @IsOptional()
  planType?: BillingPlanType;

  @IsEnum(['MONTHLY', 'ANNUAL'])
  @IsOptional()
  billingFrequency?: 'MONTHLY' | 'ANNUAL';

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  @IsNumber()
  @IsOptional()
  amountPaid?: number;
}
