import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingPlan, BillingPlanType } from '../entities';

/**
 * BillingPlanSeedingService
 * Seeds default billing plans on application startup
 */
@Injectable()
export class BillingPlanSeedingService {
  private readonly logger = new Logger(BillingPlanSeedingService.name);

  constructor(
    @InjectRepository(BillingPlan)
    private readonly billingPlanRepository: Repository<BillingPlan>,
  ) {}

  /**
   * Seed default billing plans
   */
  async seedBillingPlans(): Promise<void> {
    this.logger.log('Checking if billing plans need to be seeded...');

    const existingPlans = await this.billingPlanRepository.count();

    if (existingPlans > 0) {
      this.logger.log(`Billing plans already exist (${existingPlans} plans found). Skipping seeding.`);
      return;
    }

    this.logger.log('Seeding default billing plans...');

    const defaultPlans = [
      {
        type: BillingPlanType.FREE,
        name: 'Free Plan',
        description: 'Perfect for getting started with the payment gateway',
        monthlyPrice: 0,
        yearlyPrice: 0,
        requestsPerMinute: 50,
        maxDailyRequests: 5000,
        maxConcurrentRequests: 5,
        features: [
          'Basic payment processing',
          'API access',
          'Email support',
          'Monthly reports',
        ],
        supportTier: 'email',
        slaUptime: 99.5,
        isActive: true,
        priority: 1,
      },
      {
        type: BillingPlanType.STANDARD,
        name: 'Standard Plan',
        description: 'Great for growing businesses',
        monthlyPrice: 99,
        yearlyPrice: 990,
        requestsPerMinute: 200,
        maxDailyRequests: 50000,
        maxConcurrentRequests: 25,
        features: [
          'Advanced payment processing',
          'Webhooks & callbacks',
          'Priority email support',
          'Weekly reports',
          'Multiple payment methods',
          'Custom branding',
        ],
        supportTier: 'email',
        slaUptime: 99.9,
        isActive: true,
        priority: 2,
      },
      {
        type: BillingPlanType.PREMIUM,
        name: 'Premium Plan',
        description: 'For high-volume businesses',
        monthlyPrice: 499,
        yearlyPrice: 4990,
        requestsPerMinute: 500,
        maxDailyRequests: 250000,
        maxConcurrentRequests: 100,
        features: [
          'Enterprise payment processing',
          'Advanced webhooks',
          'Phone & email support',
          'Real-time reports & analytics',
          'All payment methods',
          'White-label solutions',
          'Custom integrations',
          'Dedicated account manager',
        ],
        supportTier: 'phone',
        slaUptime: 99.95,
        isActive: true,
        priority: 3,
      },
      {
        type: BillingPlanType.ENTERPRISE,
        name: 'Enterprise Plan',
        description: 'Customized solution for enterprises',
        monthlyPrice: 2499,
        yearlyPrice: 24990,
        requestsPerMinute: 2000,
        maxDailyRequests: 10000000,
        maxConcurrentRequests: 1000,
        features: [
          'Unlimited payment processing',
          'Custom API endpoints',
          '24/7 phone & email support',
          'Real-time analytics',
          'All payment methods',
          'Fully white-label',
          'Custom integrations',
          'Dedicated infrastructure',
          'SLA guarantees',
          'Priority onboarding',
        ],
        supportTier: 'phone',
        slaUptime: 99.99,
        isActive: true,
        priority: 4,
      },
    ];

    try {
      const plans = this.billingPlanRepository.create(defaultPlans);
      await this.billingPlanRepository.save(plans);
      this.logger.log(`Successfully seeded ${plans.length} default billing plans`);
    } catch (error) {
      this.logger.error(`Error seeding billing plans: ${error.message}`, error);
      throw error;
    }
  }
}
