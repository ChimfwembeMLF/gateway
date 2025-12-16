import { Entity, Column } from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
}

@Entity('payments')
export class Payment extends AbstractEntity {
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
  momoTransactionId: string;
}
