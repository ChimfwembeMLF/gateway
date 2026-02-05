import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Invoice } from './invoice.entity';

export enum LineItemType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  USAGE = 'USAGE',
  OVERAGE = 'OVERAGE',
  ADDON = 'ADDON',
  DISCOUNT = 'DISCOUNT',
  CREDIT = 'CREDIT',
}

/**
 * InvoiceLineItem Entity
 * Represents individual line items on an invoice
 */
@Entity('invoice_line_items')
export class InvoiceLineItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  invoiceId: string;

  /**
   * Line item type
   */
  @Column({
    type: 'enum',
    enum: LineItemType,
    default: LineItemType.SUBSCRIPTION,
  })
  type: LineItemType;

  /**
   * Description of the line item
   */
  @Column({ type: 'varchar', length: 500 })
  description: string;

  /**
   * Quantity
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantity: number;

  /**
   * Unit price
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  /**
   * Total amount (quantity * unitPrice)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  /**
   * Metadata (e.g., usage details, date ranges)
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Invoice, (invoice) => invoice.lineItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;
}
