import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, IsNull, Or } from 'typeorm';
import { BillingPlan, BillingPlanType, TenantBillingSubscription } from '../entities';

export interface RateLimitConfig {
  requestsPerMinute: number;
  maxDailyRequests: number;
  maxConcurrentRequests: number;
  priority: number;
}

/**
 * BillingLimitService
 * Determines rate limits based on tenant's billing plan
 */
@Injectable()
export class BillingLimitService {
  private readonly logger = new Logger(BillingLimitService.name);
  private readonly defaultLimits: Record<BillingPlanType, RateLimitConfig> = {
    [BillingPlanType.FREE]: {
      requestsPerMinute: 50,
      maxDailyRequests: 5000,
      maxConcurrentRequests: 5,
      priority: 1,
    },
    [BillingPlanType.STANDARD]: {
      requestsPerMinute: 200,
      maxDailyRequests: 50000,
      maxConcurrentRequests: 25,
      priority: 2,
    },
    [BillingPlanType.PREMIUM]: {
      requestsPerMinute: 500,
      maxDailyRequests: 250000,
      maxConcurrentRequests: 100,
      priority: 3,
    },
    [BillingPlanType.ENTERPRISE]: {
      requestsPerMinute: 2000,
      maxDailyRequests: 10000000,
      maxConcurrentRequests: 500,
      priority: 4,
    },
  };

  constructor(
    @InjectRepository(BillingPlan)
    private readonly billingPlanRepository: Repository<BillingPlan>,
    @InjectRepository(TenantBillingSubscription)
    private readonly subscriptionRepository: Repository<TenantBillingSubscription>,
  ) {}

  /**
   * Get rate limit config for a tenant
   * Returns the limits based on active subscription or FREE plan defaults
   */
  async getTenantRateLimits(tenantId: string): Promise<RateLimitConfig> {
    try {
      // Find active subscription for tenant
      const subscription = await this.subscriptionRepository.findOne({
        where: {
          tenantId,
          isActive: true,
          // Active if no expiration or expiration is in the future
          expiresAt: Or(IsNull(), LessThanOrEqual(new Date())),
        },
        relations: ['billingPlan'],
      });

      if (subscription && subscription.billingPlan) {
        return {
          requestsPerMinute: subscription.billingPlan.requestsPerMinute,
          maxDailyRequests: subscription.billingPlan.maxDailyRequests,
          maxConcurrentRequests: subscription.billingPlan.maxConcurrentRequests,
          priority: subscription.billingPlan.priority,
        };
      }

      // Fallback to FREE plan
      return this.defaultLimits[BillingPlanType.FREE];
    } catch (error) {
      this.logger.error(
        `Failed to get rate limits for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      // Return restrictive defaults on error
      return this.defaultLimits[BillingPlanType.FREE];
    }
  }

  /**
   * Get all active billing plans
   */
  async getActivePlans(): Promise<BillingPlan[]> {
    return this.billingPlanRepository.find({
      where: { isActive: true },
      order: { priority: 'DESC' },
    });
  }

  /**
   * Create or update a billing plan
   */
  async createOrUpdatePlan(planData: Partial<BillingPlan>): Promise<BillingPlan> {
    if (!planData.type) {
      throw new Error('Plan type is required');
    }

    let plan = await this.billingPlanRepository.findOne({
      where: { type: planData.type },
    });

    if (plan) {
      Object.assign(plan, planData);
      return this.billingPlanRepository.save(plan);
    }

    return this.billingPlanRepository.save(
      this.billingPlanRepository.create(planData),
    );
  }

  /**
   * Subscribe tenant to a billing plan
   */
  async subscribeTenantToPlan(
    tenantId: string,
    planType: BillingPlanType,
    billingFrequency: 'MONTHLY' | 'ANNUAL' = 'MONTHLY',
    autoRenew: boolean = true,
  ): Promise<TenantBillingSubscription> {
    const plan = await this.billingPlanRepository.findOne({
      where: { type: planType },
    });

    if (!plan) {
      throw new Error(`Billing plan ${planType} not found`);
    }

    // Deactivate existing active subscription
    await this.subscriptionRepository.update(
      { tenantId, isActive: true },
      { isActive: false, cancelledAt: new Date() },
    );

    // Create new subscription
    const subscription = this.subscriptionRepository.create({
      tenantId,
      billingPlanId: plan.id,
      startDate: new Date(),
      billingFrequency,
      autoRenew,
      isActive: true,
    });

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Get current subscription for a tenant
   */
  async getTenantSubscription(
    tenantId: string,
  ): Promise<TenantBillingSubscription | null> {
    return this.subscriptionRepository.findOne({
      where: { tenantId, isActive: true },
      relations: ['billingPlan'],
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    reason?: string,
  ): Promise<TenantBillingSubscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.isActive = false;
    subscription.cancelledAt = new Date();
    if (reason) {
      subscription.cancellationReason = reason;
    }

    return this.subscriptionRepository.save(subscription);
  }
}
