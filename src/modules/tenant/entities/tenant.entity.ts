import { AbstractEntity } from 'src/common/entities/abstract.entity';
import { Entity, Column, PrimaryGeneratedColumn, Index, OneToMany } from 'typeorm';
import { Disbursement } from '../../mtn/disbursement/entities';
import { TenantBillingSubscription } from '../../billing/entities';

@Entity('tenants')
@Index(['name'])
@Index(['slug'])
@Index(['apiKey'])
export class Tenant  extends AbstractEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ unique: true })
  apiKey: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  webhookUrl?: string;

  @Column({ nullable: true })
  webhookKey?: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Disbursement, (disbursement) => disbursement.tenant)
  disbursements: Disbursement[];

  @OneToMany(
    () => TenantBillingSubscription,
    (subscription) => subscription.tenant,
    { cascade: true },
  )
  billingSubscriptions: TenantBillingSubscription[];
}
