import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingPlan, BillingPlanType } from '../entities';

/**
 * BillingPlanSeeder
 * Seeds the database with default billing plans
 */
@Injectable()
export class BillingPlanSeeder {
  private readonly logger = new Logger(BillingPlanSeeder.name);

  constructor(
    @InjectRepository(BillingPlan)
    private readonly billingPlanRepository: Repository<BillingPlan>,
  ) {}

  async seed(): Promise<void> {
    this.logger.log('Seeding billing plans...');

    const plans: Partial<BillingPlan>[] = [
      {
        type: BillingPlanType.FREE,
        name: 'Free',
        description: 'For testing and small projects',
        monthlyPrice: 0,
        yearlyPrice: 0,
        requestsPerMinute: 50,
        maxDailyRequests: 5000,
        maxConcurrentRequests: 5,
        features: [
          'Basic API access',
          'Community support',
          '99% uptime SLA',
        ],
        supportTier: 'email',
        slaUptime: 99.0,
        isActive: true,
        priority: 1,
      },
      {
        type: BillingPlanType.STANDARD,
        name: 'Standard',
        description: 'For growing businesses',
        monthlyPrice: 99,
        yearlyPrice: 990,
        requestsPerMinute: 200,
        maxDailyRequests: 50000,
        maxConcurrentRequests: 25,
        features: [
          'Full API access',
          'Email and chat support',
          '99.5% uptime SLA',
          'Advanced analytics',
          'Webhook support',
          'Custom integrations',
        ],
        supportTier: 'chat',
        slaUptime: 99.5,
        isActive: true,
        priority: 2,
      },
      {
        type: BillingPlanType.PREMIUM,
        name: 'Premium',
        description: 'For established companies',
        monthlyPrice: 499,
        yearlyPrice: 4990,
        requestsPerMinute: 500,
        maxDailyRequests: 250000,
        maxConcurrentRequests: 100,
        features: [
          'Full API access',
          'Priority email and chat support',
          '99.9% uptime SLA',
          'Advanced analytics and reporting',
          'Webhook support',
          'Custom integrations',
          'Rate limit customization',
          'Dedicated account manager',
        ],
        supportTier: 'chat',
        slaUptime: 99.9,
        isActive: true,
        priority: 3,
      },
      {
        type: BillingPlanType.ENTERPRISE,
        name: 'Enterprise',
        description: 'For large-scale operations',
        monthlyPrice: 2499,
        yearlyPrice: 24990,
        requestsPerMinute: 2000,
        maxDailyRequests: 10000000,
        maxConcurrentRequests: 500,
        features: [
          'Unlimited API access',
          '24/7 phone and chat support',
          '99.99% uptime SLA',
          'Custom analytics and reporting',
          'Webhook support',
          'Custom integrations',
          'Rate limit customization',
          'Dedicated account manager',
          'Custom deployment options',
          'White-label solutions',
          'Advanced security features',
        ],
        supportTier: 'phone',
        slaUptime: 99.99,
        isActive: true,
        priority: 4,
      },
    ];

    for (const plan of plans) {
      const existing = await this.billingPlanRepository.findOne({
        where: { type: plan.type as BillingPlanType },
      });

      if (!existing) {
        const newPlan = this.billingPlanRepository.create(plan);
        await this.billingPlanRepository.save(newPlan);
        this.logger.log(`Created billing plan: ${plan.name}`);
      } else {
        this.logger.log(`Billing plan already exists: ${plan.name}`);
      }
    }

    this.logger.log('Billing plans seeding completed');
  }
}
