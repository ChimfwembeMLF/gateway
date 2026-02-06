# Email Service & Providers

Complete email notification system with support for multiple email providers.

## Features

- ✅ **Multiple Provider Support**: SendGrid, Mailgun, Mock, Console
- ✅ **Invoice Notifications**: New invoice, payment reminder, overdue notices
- ✅ **Batch Email Sending**: Send multiple emails with concurrency control
- ✅ **HTML Email Templates**: Professional invoice email templates
- ✅ **Testing Support**: Mock provider for unit/integration tests
- ✅ **Environment-Based Configuration**: Easy switching between providers

## Architecture

```
EmailService (orchestrator)
├── SendGridProvider (production)
├── MailgunProvider (production)
├── MockEmailProvider (testing)
└── ConsoleEmailProvider (development)
```

## Providers

### Console Provider (Default)

For **development** - logs emails to console.

```typescript
// Automatic in development
export default {
  email: {
    provider: 'console' // or process.env.EMAIL_PROVIDER
  }
};
```

### Mock Provider

For **testing** - stores emails in memory.

```typescript
export default {
  email: {
    provider: 'mock'
  }
};
```

Features:
- `getSentEmails()` - Get all sent emails
- `getSentEmailsCount()` - Get count
- `clearSentEmails()` - Clear storage

Example:
```typescript
it('should send invoice email', async () => {
  const mockProvider = app.get(MockEmailProvider);
  mockProvider.clearSentEmails();

  await emailService.sendInvoiceNotification('test@example.com', 'Company', invoice);

  expect(mockProvider.getSentEmailsCount()).toBe(1);
  const sent = mockProvider.getSentEmails()[0];
  expect(sent.to).toBe('test@example.com');
  expect(sent.subject).toContain(invoice.invoiceNumber);
});
```

### SendGrid Provider

For **production** - sends via SendGrid API.

**Setup:**
```bash
# Install SendGrid SDK
npm install @sendgrid/mail

# Set environment variables
export EMAIL_PROVIDER=sendgrid
export SENDGRID_API_KEY=your-api-key
export SENDGRID_FROM_EMAIL=noreply@yourcompany.com
export SENDGRID_FROM_NAME="Your Company"
```

**Configuration:**
```yaml
# config/production.yaml
email:
  provider: sendgrid
  sendgrid:
    apiKey: ${SENDGRID_API_KEY}
    fromEmail: ${SENDGRID_FROM_EMAIL}
    fromName: "Your Company"
```

### Mailgun Provider

For **production** - sends via Mailgun API.

**Setup:**
```bash
# Install Mailgun SDK
npm install mailgun.js form-data

# Set environment variables
export EMAIL_PROVIDER=mailgun
export MAILGUN_API_KEY=your-api-key
export MAILGUN_DOMAIN=your-domain.com
export MAILGUN_FROM_EMAIL=noreply@your-domain.com
```

**Configuration:**
```yaml
# config/production.yaml
email:
  provider: mailgun
  mailgun:
    apiKey: ${MAILGUN_API_KEY}
    domain: ${MAILGUN_DOMAIN}
    fromEmail: ${MAILGUN_FROM_EMAIL}
    fromName: "Your Company"
```

## Usage

### Send Invoice Notification

```typescript
import { EmailService } from 'src/modules/email/services/email.service';

constructor(private readonly emailService: EmailService) {}

async notifyInvoice(invoice: Invoice) {
  await this.emailService.sendInvoiceNotification(
    'customer@example.com',
    'Acme Corp',
    invoice
  );
}
```

### Send Payment Reminder

```typescript
async remindPayment(invoice: Invoice) {
  await this.emailService.sendInvoiceReminder(
    'customer@example.com',
    'Acme Corp',
    invoice
  );
}
```

### Send Overdue Notice

```typescript
async notifyOverdue(invoice: Invoice) {
  await this.emailService.sendOverdueNotification(
    'customer@example.com',
    'Acme Corp',
    invoice
  );
}
```

### Batch Send

```typescript
// Send multiple emails with concurrency control
await provider.sendBatch({
  emails: [
    { to: 'user1@example.com', subject: 'Invoice', html: '...' },
    { to: 'user2@example.com', subject: 'Invoice', html: '...' },
    // ...
  ],
  concurrency: 5 // max 5 parallel sends
});
```

## Email Templates

### Invoice Notification

- **Subject**: `Invoice {invoiceNumber} from Payment Gateway`
- **Content**: Full invoice details with HTML formatting
- **Call-to-Action**: Link to view invoice on dashboard

### Payment Reminder

- **Subject**: `Payment Reminder: Invoice {invoiceNumber} Due Soon`
- **Content**: Days until due, amount due, invoice number
- **Call-to-Action**: "Pay Now" button

### Overdue Notice

- **Subject**: `URGENT: Invoice {invoiceNumber} is Overdue`
- **Content**: Days overdue, warning about service suspension
- **Call-to-Action**: "Pay Now" button with red styling

## Testing

### Unit Tests

```bash
npm test -- email.service.spec
npm test -- mock.provider.spec
```

### Integration Tests

```typescript
// Using mock provider in tests
describe('Billing Service', () => {
  let emailService: EmailService;
  let mockProvider: MockEmailProvider;

  beforeEach(() => {
    mockProvider = app.get(MockEmailProvider);
    emailService.setProvider(mockProvider);
    mockProvider.clearSentEmails();
  });

  it('should send invoice on billing cycle completion', async () => {
    await billingService.completeCycle(tenant);
    
    expect(mockProvider.getSentEmailsCount()).toBe(1);
    const email = mockProvider.getSentEmails()[0];
    expect(email.subject).toContain('Invoice');
  });
});
```

## Environment Variables

```bash
# Email Provider Selection
EMAIL_PROVIDER=console|mock|sendgrid|mailgun

# SendGrid (if using SendGrid)
SENDGRID_API_KEY=sg_xxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@example.com
SENDGRID_FROM_NAME="Payment Gateway"

# Mailgun (if using Mailgun)
MAILGUN_API_KEY=key_xxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=example.mailgun.org
MAILGUN_FROM_EMAIL=noreply@example.com
MAILGUN_FROM_NAME="Payment Gateway"

# Common Settings
EMAIL_FROM=noreply@example.com
EMAIL_REPLY_TO=support@example.com
```

## Configuration Files

### Development (`.env` or `config/development.yaml`)

```yaml
email:
  provider: console # Log to console
```

### Testing (`.env.test` or `config/test.yaml`)

```yaml
email:
  provider: mock # Store in memory for assertions
```

### Production (`config/production.yaml`)

```yaml
email:
  provider: sendgrid # or mailgun
  sendgrid:
    apiKey: ${SENDGRID_API_KEY}
    fromEmail: ${SENDGRID_FROM_EMAIL}
    fromName: ${SENDGRID_FROM_NAME}
```

## Switching Providers at Runtime

```typescript
// Get current provider
const currentProvider = emailService.getProvider();

// Switch to different provider (e.g., for testing)
emailService.setProvider(mockProvider);

// Send email with new provider
await emailService.sendInvoiceNotification(email, tenant, invoice);

// Switch back
emailService.setProvider(originalProvider);
```

## Error Handling

All email sending operations throw errors that can be caught:

```typescript
try {
  await emailService.sendInvoiceNotification(email, tenant, invoice);
} catch (error) {
  logger.error(`Failed to send invoice email: ${error.message}`);
  // Handle error - e.g., queue for retry, notify admin
}
```

## Performance Considerations

- **Batch Concurrency**: Default 5 parallel requests, configurable
- **Provider Timeouts**: Set by individual providers (SendGrid, Mailgun)
- **Rate Limiting**: Handled by providers
- **Retry Logic**: Implement at application level using queues (e.g., Bull, BullMQ)

## Roadmap

- [ ] AWS SES provider
- [ ] Email queue system (Bull/BullMQ)
- [ ] Webhook for email events (sent, delivered, bounced)
- [ ] Unsubscribe management
- [ ] Email template versioning
- [ ] A/B testing support
- [ ] Internationalization (multi-language templates)
