# Idempotency Implementation Guide

## Quick Start

Idempotency prevents duplicate charges when payment requests are retried. This is critical for payment systems.

### For API Consumers

**Always send `Idempotency-Key` header on payment creation:**

```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "x-api-key: tenant_abc123..." \
  -H "x-tenant-id: my-tenant" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
  -d '{
    "amount": 1000,
    "currency": "UGX",
    "payer": "256700000000",
    "provider": "MTN",
    "flow": "COLLECTION"
  }'
```

**Idempotency-Key must be:**
- A valid UUID (RFC 4122 format)
- Unique per payment request
- Consistent across retries (same payment = same key)
- Generated once per request, not regenerated

### Example: Node.js Client

```typescript
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

class PaymentClient {
  private apiKey = 'tenant_abc123...';
  private tenantId = 'my-tenant';
  private baseUrl = 'http://localhost:3000';

  // Generate idempotency key once per payment operation
  async createPayment(amount: number, payer: string) {
    const idempotencyKey = uuidv4(); // Generated once
    
    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await axios.post(
          `${this.baseUrl}/api/v1/payments`,
          {
            amount,
            payer,
            currency: 'ZMW',
            provider: 'MTN',
            flow: 'COLLECTION'
          },
          {
            headers: {
              'x-api-key': this.apiKey,
              'x-tenant-id': this.tenantId,
              'Idempotency-Key': idempotencyKey, // Same key for all retries!
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
        
        console.log('Payment created:', response.data);
        return response.data;
        
      } catch (error) {
        const isRetryable = 
          error.code === 'ECONNABORTED' ||  // Timeout
          error.response?.status >= 500;     // Server error

        if (isRetryable && attempt < 3) {
          // Exponential backoff: 100ms, 200ms, 400ms
          const delayMs = 100 * Math.pow(2, attempt - 1);
          console.log(`Retry ${attempt}/3 after ${delayMs}ms...`);
          await sleep(delayMs);
          continue; // Retry with SAME idempotencyKey
        }
        
        throw error;
      }
    }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Usage
const client = new PaymentClient();
const payment = await client.createPayment(1000, '260777123456');
```

### Example: Python Client

```python
import uuid
import time
import requests

class PaymentClient:
    def __init__(self, api_key: str, tenant_id: str, base_url: str = 'http://localhost:3000'):
        self.api_key = api_key
        self.tenant_id = tenant_id
        self.base_url = base_url
        self.session = requests.Session()

    def create_payment(self, amount: int, payer: str, max_retries: int = 3) -> dict:
        """Create a payment with automatic retry and idempotency."""
        
        # Generate idempotency key once per operation
        idempotency_key = str(uuid.uuid4())
        
        for attempt in range(1, max_retries + 1):
            try:
                response = self.session.post(
                    f'{self.base_url}/api/v1/payments',
                    json={
                        'amount': amount,
                        'payer': payer,
                        'currency': 'ZMW',
                        'provider': 'MTN',
                        'flow': 'COLLECTION'
                    },
                    headers={
                        'x-api-key': self.api_key,
                        'x-tenant-id': self.tenant_id,
                        'Idempotency-Key': idempotency_key,  # Same key for retries!
                        'Content-Type': 'application/json'
                    },
                    timeout=5
                )
                
                response.raise_for_status()
                print(f'Payment created: {response.json()}')
                return response.json()
                
            except requests.exceptions.RequestException as error:
                is_retryable = (
                    isinstance(error, requests.exceptions.Timeout) or
                    isinstance(error, requests.exceptions.ConnectionError) or
                    (hasattr(error, 'response') and error.response and error.response.status_code >= 500)
                )
                
                if is_retryable and attempt < max_retries:
                    # Exponential backoff: 100ms, 200ms, 400ms
                    delay_ms = 100 * (2 ** (attempt - 1))
                    print(f'Retry {attempt}/{max_retries} after {delay_ms}ms...')
                    time.sleep(delay_ms / 1000)
                    continue  # Retry with SAME idempotencyKey
                
                raise

# Usage
client = PaymentClient(
    api_key='tenant_abc123...',
    tenant_id='my-tenant'
)
payment = client.create_payment(amount=1000, payer='260777123456')
```

---

## How It Works (Internal)

### Database Schema

```sql
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY,
  tenantId VARCHAR NOT NULL,
  idempotencyKey VARCHAR NOT NULL,
  method VARCHAR NOT NULL,          -- e.g., 'POST'
  path VARCHAR NOT NULL,            -- e.g., '/api/v1/payments'
  statusCode INT NOT NULL,          -- e.g., 201
  responseBody TEXT NOT NULL,       -- Serialized JSON response
  createdAt TIMESTAMP,
  expiresAt TIMESTAMP,              -- 24 hours from creation
  UNIQUE(tenantId, idempotencyKey)
);

CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expiresAt);
```

### Request Flow

```
Client Request #1
├─ Header: Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
├─ IdempotencyInterceptor checks table → NOT FOUND
├─ Process payment normally
│  ├─ Call CollectionService.requestToPay()
│  ├─ Call MTN API (expensive, slow)
│  └─ Save Payment entity
├─ Store in idempotency_keys table
│  └─ statusCode=201, responseBody={id, amount, status, ...}
└─ Return 201 Created to client

[Network timeout / client timeout]

Client Request #2 (RETRY with SAME Idempotency-Key)
├─ Header: Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
├─ IdempotencyInterceptor checks table → FOUND!
├─ Verify method=POST, path=/api/v1/payments (matches)
├─ Check TTL: expiresAt > now (within 24 hours)
├─ Return CACHED response immediately
│  └─ statusCode=201, responseBody={SAME id, amount, status, ...}
└─ ✅ No duplicate charge, client gets same result
```

### Cleanup

```bash
# Nightly cron job runs:
DELETE FROM idempotency_keys WHERE expiresAt < NOW();

# After 24 hours, the key entry is deleted
# New requests with same key are treated as new payments (safe after TTL)
```

---

## API Documentation

### Endpoint

```
POST /api/v1/payments
```

### Headers (Required)

| Header | Value | Example |
|--------|-------|---------|
| `x-api-key` | Tenant's API key | `tenant_3f4c5d6e...` |
| `x-tenant-id` | Tenant identifier | `my-tenant` |
| `Content-Type` | Must be JSON | `application/json` |

### Headers (Recommended)

| Header | Value | Example |
|--------|-------|---------|
| `Idempotency-Key` | UUID (RFC 4122) | `550e8400-e29b-41d4-a716-446655440000` |

### Request Body

```json
{
  "amount": 1000,
  "currency": "UGX",
  "payer": "256700000000",
  "provider": "MTN",
  "flow": "COLLECTION",
  "payerMessage": "Payment for Order #123",
  "payeeNote": "Thank you for your purchase"
}
```

### Response (201 Created)

```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "tenantId": "my-tenant",
  "amount": "1000.00",
  "currency": "UGX",
  "externalId": "7f8e9a0b-1c2d-3e4f-5g6h-7i8j9k0l1m2n",
  "payer": "256700000000",
  "status": "PENDING",
  "momoTransactionId": "3f4c5d6e-7f8e-9a0b-1c2d-3e4f5g6h7i8j",
  "createdAt": "2026-02-04T10:30:45.123Z"
}
```

### Error Responses

**400 Bad Request - Missing Idempotency-Key (non-critical)**
```json
{
  "statusCode": 400,
  "message": "Idempotency-Key header missing (recommended for payment requests)",
  "error": "Bad Request"
}
```

**400 Bad Request - Invalid UUID format**
```json
{
  "statusCode": 400,
  "message": "Idempotency-Key must be a valid UUID (RFC 4122)",
  "error": "Bad Request"
}
```

**400 Bad Request - Key reused for different endpoint**
```json
{
  "statusCode": 400,
  "message": "Idempotency-Key was used for a different request. Use a new key.",
  "error": "Bad Request"
}
```

**429 Too Many Requests - Rate limited**
```json
{
  "statusCode": 429,
  "message": "Too Many Requests"
}
```

**500 Internal Server Error - MTN API failed**
```json
{
  "statusCode": 500,
  "message": "Failed to request to pay",
  "error": "Internal Server Error"
}
```

---

## Testing Idempotency

### Manual Test with cURL

```bash
# Generate a unique key
KEY="550e8400-e29b-41d4-a716-446655440000"

# Request 1: Initial payment
curl -X POST http://localhost:3000/api/v1/payments \
  -H "x-api-key: tenant_abc123..." \
  -H "x-tenant-id: my-tenant" \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "UGX",
    "payer": "256700000000"
  }'

# Returns: {"id": "payment-uuid-1", "status": "PENDING", ...}

# Request 2: Retry with SAME key
curl -X POST http://localhost:3000/api/v1/payments \
  -H "x-api-key: tenant_abc123..." \
  -H "x-tenant-id: my-tenant" \
  -H "Idempotency-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "UGX",
    "payer": "256700000000"
  }'

# Returns: {"id": "payment-uuid-1", "status": "PENDING", ...}  ← SAME payment ID!

# Verify only one payment was created (not two)
curl -X GET http://localhost:3000/api/v1/payments \
  -H "x-api-key: tenant_abc123..." \
  -H "x-tenant-id: my-tenant"

# Should show only 1 payment with that ID, not 2 duplicates ✅
```

### Automated Test (Jest)

```typescript
// test/idempotency.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { v4 as uuidv4 } from 'uuid';

describe('Idempotency (E2E)', () => {
  let app: INestApplication;
  let apiKey: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Setup: Create test tenant and get API key
    apiKey = 'tenant_test123...';
    tenantId = 'test-tenant';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/payments with Idempotency-Key', () => {
    it('should return same response on retry with same key', async () => {
      const idempotencyKey = uuidv4();
      const payload = {
        amount: 1000,
        currency: 'UGX',
        payer: '256700000000'
      };

      // Request 1
      const response1 = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', apiKey)
        .set('x-tenant-id', tenantId)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload);

      expect(response1.status).toBe(201);
      expect(response1.body.id).toBeDefined();
      const paymentId1 = response1.body.id;

      // Request 2: Retry with SAME key
      const response2 = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', apiKey)
        .set('x-tenant-id', tenantId)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload);

      expect(response2.status).toBe(201);
      expect(response2.body.id).toBe(paymentId1); // SAME ID!
      expect(response2.body).toEqual(response1.body);
    });

    it('should reject mismatched method+path for same key', async () => {
      const idempotencyKey = uuidv4();

      // Create payment with POST
      await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', apiKey)
        .set('x-tenant-id', tenantId)
        .set('Idempotency-Key', idempotencyKey)
        .send({amount: 1000, currency: 'UGX', payer: '256700000000'});

      // Try to GET with same key (different method+path)
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments')
        .set('x-api-key', apiKey)
        .set('x-tenant-id', tenantId)
        .set('Idempotency-Key', idempotencyKey);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('different request');
    });

    it('should reject invalid UUID format for Idempotency-Key', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments')
        .set('x-api-key', apiKey)
        .set('x-tenant-id', tenantId)
        .set('Idempotency-Key', 'not-a-uuid')
        .send({amount: 1000, currency: 'UGX', payer: '256700000000'});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('UUID');
    });
  });
});
```

---

## Common Questions

**Q: Is Idempotency-Key required?**
A: Recommended but not strictly required. Without it, retries may create duplicate payments. We log a warning but still process the request.

**Q: What if I send different request body with same Idempotency-Key?**
A: The server returns the cached response from first request, ignoring the new body. Always use same request body with same key.

**Q: How long are idempotency records kept?**
A: 24 hours by default. After TTL expires, the key can be reused (treated as new payment). Configurable via code.

**Q: What if MTN API is slow and times out?**
A:
1. Client gets timeout error
2. Client retries with SAME Idempotency-Key
3. Server returns cached response (if first attempt succeeded)
4. No duplicate charge ✅

**Q: Can I change the TTL?**
A: Yes, edit `idempotency.service.ts` in `saveIdempotencyKey()` method. Currently 24 hours.

**Q: Does idempotency work across different tenants?**
A: No, idempotency keys are scoped per tenant. Same key can be used by different tenants.

**Q: What if the database is down?**
A: Idempotency service logs error but doesn't throw. Request still succeeds, but caching fails. On retry without cache, may create duplicate (recoverable manually).

---

## Files Modified

- `src/modules/payments/idempotency/idempotency-key.entity.ts` - New entity
- `src/modules/payments/idempotency/idempotency.service.ts` - New service
- `src/modules/payments/idempotency/idempotency.interceptor.ts` - New interceptor
- `src/modules/payments/idempotency/index.ts` - Barrel export
- `src/modules/payments/transaction.module.ts` - Added IdempotencyKey + Service
- `src/modules/payments/payments.controller.ts` - Added IdempotencyInterceptor
- `src/common/database/migrations/1770239000000-AddIdempotencyKeysTable.ts` - New migration

---

**Need help?** Ask the engineering team or file an issue.
