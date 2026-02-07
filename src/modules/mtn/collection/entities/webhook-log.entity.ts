import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum WebhookStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * WebhookLog Entity
 * 
 * Stores incoming webhook notifications from MTN for:
 * 1. Deduplication (prevent duplicate processing)
 * 2. Audit trail (track all webhooks received)
 * 3. Debugging (analyze failed webhook processing)
 */
@Entity('webhook_logs')
@Index(['transactionId'])
@Index(['status', 'createdAt'])
@Index(['createdAt'])
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 100, unique: true })
  transactionId: string;

  @Column('json')
  payload: any;

  @Column('varchar', { length: 500 })
  signature: string;

  @Column('enum', { enum: WebhookStatus, default: WebhookStatus.PENDING })
  status: WebhookStatus;

  @Column('json', { nullable: true })
  result: any;

  @Column('text', { nullable: true })
  error: string | null;

  @Column('timestamp', { nullable: true })
  processedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
