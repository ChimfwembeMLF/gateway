import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';

/**
 * UsageMetrics Entity
 * Tracks API usage per tenant for billing and analytics
 */
@Entity('usage_metrics')
@Index(['tenantId', 'date'])
@Index(['tenantId', 'createdAt'])
@Index(['date'])
export class UsageMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  /**
   * Date for daily aggregation (YYYY-MM-DD)
   */
  @Column({ type: 'date' })
  date: string;

  /**
   * Total API requests for this day
   */
  @Column({ type: 'int', default: 0 })
  totalRequests: number;

  /**
   * Successful requests (2xx status)
   */
  @Column({ type: 'int', default: 0 })
  successfulRequests: number;

  /**
   * Failed requests (4xx, 5xx status)
   */
  @Column({ type: 'int', default: 0 })
  failedRequests: number;

  /**
   * Rate limited requests (429 status)
   */
  @Column({ type: 'int', default: 0 })
  rateLimitedRequests: number;

  /**
   * Average response time in milliseconds
   */
  @Column({ type: 'float', default: 0 })
  avgResponseTime: number;

  /**
   * Peak requests per minute during the day
   */
  @Column({ type: 'int', default: 0 })
  peakRequestsPerMinute: number;

  /**
   * Total data transferred (bytes)
   */
  @Column({ type: 'bigint', default: 0 })
  dataTransferred: number;

  /**
   * Breakdown by endpoint (JSON)
   * Example: { "/payments": 1000, "/disbursements": 500 }
   */
  @Column({ type: 'jsonb', default: {} })
  endpointBreakdown: Record<string, number>;

  /**
   * Breakdown by status code (JSON)
   * Example: { "200": 950, "201": 50, "404": 10 }
   */
  @Column({ type: 'jsonb', default: {} })
  statusCodeBreakdown: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
