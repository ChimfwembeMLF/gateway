import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Tenant } from '../../../tenant/entities/tenant.entity';
import { DisbursementTransaction } from './index';

export enum DisbursementType {
  TRANSFER = 'TRANSFER',
  DEPOSIT = 'DEPOSIT',
  REFUND = 'REFUND',
}

export enum DisbursementStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('disbursements')
@Index(['tenantId', 'externalId'])
@Index(['tenantId', 'createdAt'])
@Index(['status', 'createdAt'])
export class Disbursement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  tenantId: string;

  @ManyToOne(() => Tenant, (tenant) => tenant.disbursements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @Column('enum', { enum: DisbursementType })
  type: DisbursementType;

  @Column('enum', { enum: DisbursementStatus, default: DisbursementStatus.PENDING })
  status: DisbursementStatus;

  @Column('varchar', { length: 100 })
  externalId: string;

  @Column('numeric', { precision: 15, scale: 2 })
  amount: number;

  @Column('varchar', { length: 3 })
  currency: string;

  @Column('varchar', { length: 20 })
  payeeType: string; // MSISDN, EMAIL, ID

  @Column('varchar', { length: 255 })
  payeeId: string;

  @Column('varchar', { length: 500, nullable: true })
  payerMessage: string;

  @Column('varchar', { length: 500, nullable: true })
  payeeNote: string;

  @Column('varchar', { length: 50, nullable: true })
  mtnTransactionId: string;

  @Column('varchar', { length: 255, nullable: true })
  mtnCallbackUrl: string;

  @Column('varchar', { length: 50, nullable: true })
  provider: string; // MTN, AIRTEL, etc.

  @Column('json', { nullable: true })
  errorDetails: {
    code?: string;
    message?: string;
    reason?: string;
  };

  @Column('int', { default: 0 })
  retryCount: number;

  @Column('timestamp', { nullable: true })
  nextRetryAt: Date;

  @Column('timestamp', { nullable: true })
  completedAt: Date;

  @OneToMany(
    () => DisbursementTransaction,
    (transaction: DisbursementTransaction) => transaction.disbursement,
    {
      cascade: true,
      eager: true,
    },
  )
  transactions: DisbursementTransaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('timestamp', { nullable: true })
  expiresAt: Date;
}
