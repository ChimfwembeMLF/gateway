import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { BillingPlan } from './billing-plan.entity';

/**
 * TenantBillingSubscription Entity
 * Tracks which billing plan each tenant is subscribed to
 */
@Entity('tenant_billing_subscriptions')
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'expiresAt'])
export class TenantBillingSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  billingPlanId: string;

  /**
   * When the subscription started
   */
  @Column({ type: 'timestamp' })
  startDate: Date;

  /**
   * When the subscription expires (null = no expiration)
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  /**
   * Billing frequency
   */
  @Column({ type: 'varchar', length: 50, default: 'MONTHLY' })
  billingFrequency: 'MONTHLY' | 'ANNUAL';

  /**
   * Auto-renewal enabled
   */
  @Column({ type: 'boolean', default: true })
  autoRenew: boolean;

  /**
   * Amount paid
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  amountPaid: number;

  /**
   * Whether subscription is currently active
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Cancellation reason
   */
  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  /**
   * Cancelled at timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  cancelledAt: Date;

  /**
   * Custom notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, (tenant) => tenant.billingSubscriptions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => BillingPlan, (plan) => plan.subscriptions, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'billingPlanId' })
  billingPlan: BillingPlan;
}
