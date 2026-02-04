import { Payment, PaymentFlow, PaymentStatus } from 'src/modules/payments/entities/payment.entity';

export class PaymentFactory {
  static create(overrides?: Partial<Payment>): Payment {
    const payment = new Payment();
    payment.id = overrides?.id || 'test-payment-id';
    payment.tenantId = overrides?.tenantId || 'test-tenant-id';
    payment.externalId = overrides?.externalId || `ext-${Date.now()}`;
    payment.flow = overrides?.flow || PaymentFlow.COLLECTION;
    payment.amount = overrides?.amount || 1000;
    payment.currency = overrides?.currency || 'UGX';
    payment.payer = overrides?.payer || '256700000000';
    payment.payeeNote = overrides?.payeeNote || 'Test payment';
    payment.payerMessage = overrides?.payerMessage || 'Test message';
    payment.status = overrides?.status || PaymentStatus.PENDING;
    payment.createdAt = overrides?.createdAt || new Date();
    payment.updatedAt = overrides?.updatedAt || new Date();
    return payment;
  }

  static createSuccessful(overrides?: Partial<Payment>): Payment {
    return PaymentFactory.create({
      ...overrides,
      status: PaymentStatus.SUCCESSFUL,
    });
  }

  static createFailed(overrides?: Partial<Payment>): Payment {
    return PaymentFactory.create({
      ...overrides,
      status: PaymentStatus.FAILED,
    });
  }
}
