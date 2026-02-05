import { Entity, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { Payment } from './payment.entity';
import { AbstractEntity } from '../../../common/entities/abstract.entity';

export enum TransactionType {
  REQUEST_TO_PAY = 'REQUEST_TO_PAY',
  STATUS_QUERY = 'STATUS_QUERY',
}

@Entity('transactions')
@Index(['tenantId'])
@Index(['type'])
@Index(['paymentId'])
export class Transaction extends AbstractEntity {
  @Column({ nullable: false })
  tenantId: string;

  @Column('uuid')
  paymentId: string;

  @ManyToOne(() => Payment, (payment) => payment.transactions, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ nullable: true })
  momoReferenceId: string;

  @Column({ nullable: true })
  response: string;

  @Column({ nullable: true })
  status: string;
}
