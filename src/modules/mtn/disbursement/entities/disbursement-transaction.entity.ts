import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Disbursement } from './disbursement.entity';

export enum TransactionStatus {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
}

@Entity('disbursement_transactions')
@Index(['disbursementId', 'createdAt'])
@Index(['mtnTransactionId'])
export class DisbursementTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  disbursementId: string;

  @ManyToOne(() => Disbursement, (disbursement) => disbursement.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'disbursementId' })
  disbursement: Disbursement;

  @Column('enum', { enum: TransactionStatus })
  status: TransactionStatus;

  @Column('varchar', { length: 100, nullable: true })
  mtnTransactionId: string;

  @Column('varchar', { length: 50 })
  provider: string;

  @Column('int', { nullable: true })
  httpStatusCode: number;

  @Column('json', { nullable: true })
  requestPayload: any;

  @Column('json', { nullable: true })
  responsePayload: any;

  @Column('json', { nullable: true })
  errorDetails: {
    code?: string;
    message?: string;
    httpStatus?: number;
  };

  @Column('int')
  durationMs: number;

  @CreateDateColumn()
  createdAt: Date;
}
