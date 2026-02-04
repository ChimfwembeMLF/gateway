import { Entity, Column, Index, CreateDateColumn } from 'typeorm';
import { AbstractEntity } from '../../../common/entities/abstract.entity';

/**
 * Idempotency-Key storage for deduplicating payment requests.
 * Ensures that if a client retries a request with the same Idempotency-Key,
 * we return the cached response instead of creating a duplicate payment.
 *
 * Pattern: Client sends header `Idempotency-Key: <uuid>` on payment creation.
 * Server stores the key + response on success.
 * If same key is seen again, return cached response.
 */
@Entity('idempotency_keys')
@Index(['tenantId', 'idempotencyKey'], { unique: true })
@Index(['expiresAt'])
export class IdempotencyKey extends AbstractEntity {
  @Column()
  tenantId: string;

  @Column()
  idempotencyKey: string;

  @Column()
  method: string; // e.g., 'POST'

  @Column()
  path: string; // e.g., '/api/v1/payments'

  @Column()
  statusCode: number;

  @Column('text')
  responseBody: string; // Serialized response JSON

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp' })
  expiresAt: Date; // TTL for idempotency records (default: 24 hours)
}
