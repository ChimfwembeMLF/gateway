import { BillingPlanResponseDto } from './billing-plan-response.dto';

export class SubscriptionResponseDto {
  id: string;
  tenantId: string;
  billingPlan: BillingPlanResponseDto;
  startDate: Date;
  expiresAt: Date | null;
  billingFrequency: string;
  autoRenew: boolean;
  amountPaid: number | null;
  isActive: boolean;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
