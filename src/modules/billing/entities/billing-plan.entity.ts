import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TenantBillingSubscription } from './tenant-billing-subscription.entity';

export enum BillingPlanType {
  FREE = 'FREE',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * BillingPlan Entity
 * Defines different service tiers with associated rate limits and features
 */
@Entity('billing_plans')
export class BillingPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: BillingPlanType, unique: true })
  type: BillingPlanType;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  yearlyPrice: number;

  /**
   * Rate limiting configuration (requests per minute)
   */
  @Column({ type: 'int', default: 100 })
  requestsPerMinute: number;

  /**
   * Maximum API calls per day
   */
  @Column({ type: 'int', default: 10000 })
  maxDailyRequests: number;

  /**
   * Maximum concurrent requests
   */
  @Column({ type: 'int', default: 10 })
  maxConcurrentRequests: number;

  /**
   * Features included in this plan (JSON array of feature names)
   */
  @Column({ type: 'jsonb', default: [] })
  features: string[];

  /**
   * Support tier (email, chat, phone)
   */
  @Column({ type: 'varchar', length: 50, default: 'email' })
  supportTier: string;

  /**
   * SLA uptime guarantee (e.g., 99.9)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 99.0 })
  slaUptime: number;

  /**
   * Whether this plan is available for new signups
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Priority for API processing (higher = more priority)
   */
  @Column({ type: 'int', default: 1 })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(
    () => TenantBillingSubscription,
    (subscription) => subscription.billingPlan,
    { cascade: true },
  )
  subscriptions: TenantBillingSubscription[];
}
