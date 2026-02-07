import { InvoiceStatus, LineItemType } from '../entities';

export class InvoiceLineItemResponseDto {
  id: string;
  type: LineItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  metadata?: Record<string, any>;
}

export class InvoiceResponseDto {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  subscriptionId?: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  currency: string;
  status: InvoiceStatus;
  paidAt?: Date;
  paymentMethod?: string;
  paymentTransactionId?: string;
  notes?: string;
  pdfUrl?: string;
  emailSent: boolean;
  emailSentAt?: Date;
  lineItems: InvoiceLineItemResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
