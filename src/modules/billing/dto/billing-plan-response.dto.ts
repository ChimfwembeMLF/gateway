export class BillingPlanResponseDto {
  id: string;
  type: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  requestsPerMinute: number;
  maxDailyRequests: number;
  maxConcurrentRequests: number;
  features: string[];
  supportTier: string;
  slaUptime: number;
  isActive: boolean;
  priority: number;
}
