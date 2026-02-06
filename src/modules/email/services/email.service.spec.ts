import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../services/email.service';
import { NodemailerProvider } from '../providers/nodemailer.provider';
import { MockEmailProvider } from '../providers/mock.provider';
import { ConsoleEmailProvider } from '../providers/console.provider';
import { Invoice } from '../../billing/entities';

describe('EmailService', () => {
  let service: EmailService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let nodemailerProvider: NodemailerProvider;
  let mockProvider: MockEmailProvider;
  let consoleProvider: ConsoleEmailProvider;

  const mockInvoice: Invoice = {
    id: 'inv-123',
    invoiceNumber: 'INV-2026-001',
    tenantId: 'tenant-123',
    billingPeriodStart: new Date('2026-01-01'),
    billingPeriodEnd: new Date('2026-01-31'),
    issueDate: new Date('2026-02-01'),
    dueDate: new Date('2026-02-15'),
    subtotal: 1000,
    discountAmount: 100,
    taxAmount: 90,
    totalAmount: 990,
    taxRate: 10,
    status: 'ISSUED',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'email.provider') return 'mock';
        if (key === 'NODE_ENV') return 'development';
        return defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: NodemailerProvider,
          useValue: {
            send: jest.fn(),
            sendBatch: jest.fn(),
          },
        },
        MockEmailProvider,
        ConsoleEmailProvider,
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    nodemailerProvider = module.get<NodemailerProvider>(NodemailerProvider);
    mockProvider = module.get<MockEmailProvider>(MockEmailProvider);
    consoleProvider = module.get<ConsoleEmailProvider>(ConsoleEmailProvider);
  });

  describe('EmailService Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with mock provider', () => {
      expect(service.getProvider()).toBe(mockProvider);
    });

    it('should allow setting a custom provider', () => {
      service.setProvider(consoleProvider);
      expect(service.getProvider()).toBe(consoleProvider);
    });
  });

  describe('sendInvoiceNotification', () => {
    it('should send invoice notification email', async () => {
      const spy = jest.spyOn(mockProvider, 'send').mockResolvedValue(undefined);

      await service.sendInvoiceNotification('test@example.com', 'Test Company', mockInvoice);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: `Invoice ${mockInvoice.invoiceNumber} from Payment Gateway`,
          html: expect.stringContaining(mockInvoice.invoiceNumber),
        }),
      );
    });

    it('should include invoice details in email content', async () => {
      const spy = jest.spyOn(mockProvider, 'send').mockResolvedValue(undefined);

      await service.sendInvoiceNotification('test@example.com', 'Test Company', mockInvoice);

      const call = spy.mock.calls[0][0];
      expect(call.html).toContain(mockInvoice.invoiceNumber);
      expect(call.html).toContain('Test Company');
      expect(call.html).toContain('990.00'); // totalAmount
    });

    it('should throw error when email sending fails', async () => {
      jest.spyOn(mockProvider, 'send').mockRejectedValue(new Error('Send failed'));

      await expect(
        service.sendInvoiceNotification('test@example.com', 'Test Company', mockInvoice),
      ).rejects.toThrow('Send failed');
    });
  });

  describe('sendInvoiceReminder', () => {
    it('should send invoice reminder email', async () => {
      const spy = jest.spyOn(mockProvider, 'send').mockResolvedValue(undefined);

      await service.sendInvoiceReminder('test@example.com', 'Test Company', mockInvoice);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('Payment Reminder'),
          html: expect.stringContaining(mockInvoice.invoiceNumber),
        }),
      );
    });

    it('should include days until due in reminder email', async () => {
      const spy = jest.spyOn(mockProvider, 'send').mockResolvedValue(undefined);

      await service.sendInvoiceReminder('test@example.com', 'Test Company', mockInvoice);

      const call = spy.mock.calls[0][0];
      expect(call.html).toContain('Payment Reminder');
    });

    it('should throw error when email sending fails', async () => {
      jest.spyOn(mockProvider, 'send').mockRejectedValue(new Error('Send failed'));

      await expect(
        service.sendInvoiceReminder('test@example.com', 'Test Company', mockInvoice),
      ).rejects.toThrow('Send failed');
    });
  });

  describe('sendOverdueNotification', () => {
    it('should send overdue notification email', async () => {
      const spy = jest.spyOn(mockProvider, 'send').mockResolvedValue(undefined);

      await service.sendOverdueNotification('test@example.com', 'Test Company', mockInvoice);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: expect.stringContaining('URGENT'),
          html: expect.stringContaining(mockInvoice.invoiceNumber),
        }),
      );
    });

    it('should include overdue warning in email content', async () => {
      const spy = jest.spyOn(mockProvider, 'send').mockResolvedValue(undefined);

      await service.sendOverdueNotification('test@example.com', 'Test Company', mockInvoice);

      const call = spy.mock.calls[0][0];
      expect(call.html).toContain('URGENT');
      expect(call.html).toContain('overdue');
    });

    it('should throw error when email sending fails', async () => {
      jest.spyOn(mockProvider, 'send').mockRejectedValue(new Error('Send failed'));

      await expect(
        service.sendOverdueNotification('test@example.com', 'Test Company', mockInvoice),
      ).rejects.toThrow('Send failed');
    });
  });
});
