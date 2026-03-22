export enum PaymentFlow {
  COLLECTION = 'collection',
  DISBURSEMENT = 'disbursement',
}
import { Entity, Column, Index, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';
import { Transaction } from './transaction.entity';
import { PaymentProvider } from '../../../common/enums/provider.enum';
import { ZambiaNetwork } from 'src/common/enums/zambia-network.enum';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
}

@Entity('payments')
@Index(['tenantId'])
@Index(['externalId'])
@Index(['providerTransactionId'])
@Index(['provider'])
@Index(['network'])
export class Payment extends AbstractEntity {
    @Column({ type: 'enum', enum: PaymentFlow, default: PaymentFlow.COLLECTION })
    flow: PaymentFlow;
  @Column({ type: 'enum', enum: PaymentProvider, default: PaymentProvider.PAWAPAY })
  provider: PaymentProvider;

  @Column({ type: 'enum', enum: ZambiaNetwork, nullable: true })
  network: ZambiaNetwork;
  @Column({ nullable: false })
  tenantId: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ default: 'EUR' })
  currency: string;

  @Column()
  externalId: string;

  @Column()
  payer: string;

  @Column({ nullable: true })
  payerMessage: string;

  @Column({ nullable: true })
  payeeNote: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ nullable: true })
  providerTransactionId: string;

  @OneToMany(() => Transaction, (transaction) => transaction.payment, {
    cascade: true,
    eager: false,
  })
  transactions: Transaction[];

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;
}
