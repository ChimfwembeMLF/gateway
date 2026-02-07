import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenant/entities/tenant.entity';
import { InvoiceLineItem } from './invoice-line-item.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

/**
 * Invoice Entity
 * Represents billing invoices for tenant subscriptions and usage
 */
@Entity('invoices')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'dueDate'])
@Index(['invoiceNumber'])
@Index(['billingPeriodStart', 'billingPeriodEnd'])
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  invoiceNumber: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  subscriptionId: string;

  /**
   * Billing period start date
   */
  @Column({ type: 'date' })
  billingPeriodStart: Date;

  /**
   * Billing period end date
   */
  @Column({ type: 'date' })
  billingPeriodEnd: Date;

  /**
   * Invoice issue date
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  issueDate: Date;

  /**
   * Payment due date
   */
  @Column({ type: 'date' })
  dueDate: Date;

  /**
   * Subtotal before tax (sum of line items)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  /**
   * Tax amount
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  /**
   * Tax rate percentage
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  /**
   * Discount amount
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  /**
   * Total amount due (subtotal + tax - discount)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  /**
   * Amount paid
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amountPaid: number;

  /**
   * Currency code (ISO 4217)
   */
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  /**
   * Invoice status
   */
  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  /**
   * Payment date
   */
  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  /**
   * Payment method
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: string;

  /**
   * Payment transaction ID
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentTransactionId: string;

  /**
   * Additional notes
   */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * PDF file path or URL
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfUrl: string;

  /**
   * Email sent flag
   */
  @Column({ type: 'boolean', default: false })
  emailSent: boolean;

  /**
   * Email sent date
   */
  @Column({ type: 'timestamp', nullable: true })
  emailSentAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @OneToMany(() => InvoiceLineItem, (lineItem) => lineItem.invoice, {
    cascade: true,
    eager: true,
  })
  lineItems: InvoiceLineItem[];
}
