# Nodemailer Email Provider Setup

Nodemailer is a flexible SMTP-based email provider that works with any SMTP server (Gmail, Outlook, custom servers, etc.).

## Installation

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## Environment Variables

```dotenv
# Email Provider Selection
EMAIL_PROVIDER=nodemailer

# Nodemailer SMTP Configuration
NODEMAILER_HOST=smtp.gmail.com           # SMTP server host
NODEMAILER_PORT=587                      # SMTP server port
NODEMAILER_SECURE=false                  # true for 465, false for other ports
NODEMAILER_USER=your-email@gmail.com     # SMTP username
NODEMAILER_PASS=your-app-password        # SMTP password or app-specific password
NODEMAILER_FROM_EMAIL=noreply@paymentgateway.com
NODEMAILER_FROM_NAME=Payment Gateway
```

## Common SMTP Configurations

### Gmail

```dotenv
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_SECURE=false
NODEMAILER_USER=your-email@gmail.com
# For Gmail, use App Passwords (not regular password)
# https://myaccount.google.com/apppasswords
NODEMAILER_PASS=xxxx xxxx xxxx xxxx
```

### Outlook/Office365

```dotenv
NODEMAILER_HOST=smtp.office365.com
NODEMAILER_PORT=587
NODEMAILER_SECURE=false
NODEMAILER_USER=your-email@outlook.com
NODEMAILER_PASS=your-password
```

### Amazon SES

```dotenv
NODEMAILER_HOST=email-smtp.us-east-1.amazonaws.com
NODEMAILER_PORT=587
NODEMAILER_SECURE=false
NODEMAILER_USER=your-ses-username
NODEMAILER_PASS=your-ses-password
```

### Custom SMTP Server

```dotenv
NODEMAILER_HOST=mail.yourdomain.com
NODEMAILER_PORT=587  # or 465 for SSL
NODEMAILER_SECURE=false  # or true if using port 465
NODEMAILER_USER=your-username
NODEMAILER_PASS=your-password
```

## Configuration File

Update `config/default.yaml`:

```yaml
email:
  provider: "${EMAIL_PROVIDER}"
  nodemailer:
    host: "${NODEMAILER_HOST}"
    port: "${NODEMAILER_PORT}"
    secure: "${NODEMAILER_SECURE}"
    user: "${NODEMAILER_USER}"
    pass: "${NODEMAILER_PASS}"
    from_email: "${NODEMAILER_FROM_EMAIL}"
    from_name: "${NODEMAILER_FROM_NAME}"
```

## Usage Example

```typescript
import { Injectable } from '@nestjs/common';
import { EmailService } from './services/email.service';

@Injectable()
export class BillingService {
  constructor(private emailService: EmailService) {}

  async sendInvoice(tenantId: string, invoiceData: InvoiceDto) {
    // Send invoice notification via configured email provider
    await this.emailService.sendInvoiceNotification({
      to: invoiceData.customerEmail,
      subject: `Invoice #${invoiceData.invoiceId}`,
      html: '<h1>Your Invoice</h1>...',
    });
  }
}
```

## Switching Providers

To switch between email providers, simply change the `EMAIL_PROVIDER` environment variable:

```bash
# Use console provider (development)
EMAIL_PROVIDER=console

# Use nodemailer with Gmail
EMAIL_PROVIDER=nodemailer
NODEMAILER_HOST=smtp.gmail.com
NODEMAILER_PORT=587
NODEMAILER_SECURE=false
NODEMAILER_USER=your-email@gmail.com
NODEMAILER_PASS=app-password

# Use SendGrid (production)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-api-key

# Use mock provider (testing)
EMAIL_PROVIDER=mock
```

## Testing

### Unit Test Example

```typescript
import { Test } from '@nestjs/testing';
import { EmailService } from './email.service';
import { MockEmailProvider } from './providers/mock.provider';

describe('EmailService', () => {
  let emailService: EmailService;
  let mockProvider: MockEmailProvider;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [EmailService, MockEmailProvider],
    }).compile();

    emailService = module.get(EmailService);
    mockProvider = module.get(MockEmailProvider);
  });

  it('should send invoice notification', async () => {
    await emailService.sendInvoiceNotification({
      to: 'customer@example.com',
      invoiceId: 'INV-001',
      amount: 1000,
      dueDate: new Date(),
    });

    const sentEmails = mockProvider.getSentEmails();
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe('customer@example.com');
  });
});
```

### Integration Test with Real SMTP

For integration tests, use a test SMTP server like [Ethereal Email](https://ethereal.email/):

```typescript
// In test setup
process.env.NODEMAILER_HOST = 'smtp.ethereal.email';
process.env.NODEMAILER_PORT = '587';
process.env.NODEMAILER_SECURE = 'false';
process.env.NODEMAILER_USER = 'ethereal-test-user';
process.env.NODEMAILER_PASS = 'ethereal-test-password';
```

## Troubleshooting

### Connection Refused

- Verify SMTP server host and port are correct
- Check firewall/network allows outgoing SMTP connections
- Verify credentials are correct

### Authentication Failed

- For Gmail: Use App Passwords, not regular account password
- For other providers: Reset/verify credentials in provider dashboard
- Check for special characters in password that need escaping

### Emails Not Delivering

- Check spam folder for emails (common with development servers)
- Verify "from" email address is verified in provider's dashboard
- Check email logs in provider dashboard for bounce reasons

### Port Restrictions

If port 587 or 465 is blocked by network:
- Try port 25 (unencrypted, slower)
- Contact network administrator to unblock SMTP ports
- Use alternative SMTP provider that supports different ports

## Security Best Practices

1. **Never commit credentials to git**
   - Store passwords in environment variables or `.env` (git-ignored)
   - Use secure secret management in production (e.g., AWS Secrets Manager)

2. **Use app-specific passwords**
   - For Gmail and other providers supporting app passwords
   - Prevents exposing main account password

3. **Enable TLS/SSL**
   - Always use `secure: true` for port 465
   - Use `secure: false` with port 587 (SMTP with STARTTLS)

4. **Monitor email logs**
   - Track sent emails for debugging
   - Identify suspicious sending patterns

## Performance Considerations

- Nodemailer queues emails and handles retries automatically
- For high-volume sending, use `sendBatch()` with controlled concurrency
- Default batch concurrency is 5 (configurable)

## Future Enhancements

- Add support for HTML templates with variables
- Implement email retry logic with exponential backoff
- Add webhook support for delivery tracking
- Implement email scheduling
