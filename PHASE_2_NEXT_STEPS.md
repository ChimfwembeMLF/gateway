# Next Steps - Phase 2: Stability

**Current Status:** Phase 1 (Security) ✅ Complete + Idempotency ✅ Implemented
**Goal:** Phase 2 (Stability) - Error handling + Webhook security
**Effort:** 22-31 hours | **Timeline:** 3-4 days

---

## Immediate Actions (Today)

### 1. Apply Idempotency Migration
```bash
# Apply the migration we just created
cd /home/kangwa/Documents/Personal/gateway
yarn db:migrate

# Expected output:
# ✅ Running migration: 1770239000000-AddIdempotencyKeysTable
#    → Created table idempotency_keys
#    → Created indexes
```

### 2. Verify Compilation
```bash
yarn tsc --noEmit

# Should show: ✅ No errors
# If errors: fix immediately before proceeding
```

### 3. Start Application
```bash
yarn start:dev

# Expected output:
# [Nest] 3000  02/04/2026, 10:30:45 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 3000  02/04/2026, 10:30:45 AM     LOG [InstanceLoader] PaymentsModule dependencies initialized
# ...
# [Nest] 3000  02/04/2026, 10:30:46 AM     LOG [NestApplication] Nest application successfully started
```

### 4. Test Idempotency
```bash
# Open new terminal
KEY="550e8400-e29b-41d4-a716-446655440000"

# First request
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

# Should return: {"id": "...", "status": "PENDING", ...}

# Second request (retry with SAME key)
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

# Should return: SAME payment ID ✅
```

---

## Phase 2.1: Error Handling & Retry Logic (8-12 hours)

### Files to Create

#### 1. MTN Error Handler
**File:** `src/modules/mtn/mtn-error.handler.ts`

```typescript
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AxiosError } from 'axios';

export interface MtnErrorResponse {
  code: string;
  message: string;
  retryable: boolean;
  statusCode: number;
}

/**
 * Classify MTN API errors into actionable categories.
 * Helps clients decide: retry, fail, or manual intervention.
 */
export class MtnErrorHandler {
  static handle(error: any): MtnErrorResponse {
    const status = error?.response?.status;
    const data = error?.response?.data;

    // 409 Conflict - Duplicate request (idempotency worked!)
    if (status === 409) {
      return {
        code: 'DUPLICATE_REQUEST',
        message: 'Request already processed (idempotency working)',
        retryable: false,
        statusCode: 409,
      };
    }

    // 422 Unprocessable - Invalid payer phone number
    if (status === 422) {
      return {
        code: 'INVALID_PAYER',
        message: data?.message || 'Invalid payer phone number or format',
        retryable: false,
        statusCode: 422,
      };
    }

    // 429 Too Many Requests - Rate limited by MTN
    if (status === 429) {
      return {
        code: 'RATE_LIMITED',
        message: 'MTN API rate limit exceeded',
        retryable: true,
        statusCode: 429,
      };
    }

    // 503 Service Unavailable - MTN down
    if (status === 503) {
      return {
        code: 'SERVICE_UNAVAILABLE',
        message: 'MTN API temporarily unavailable',
        retryable: true,
        statusCode: 503,
      };
    }

    // 500+ Server errors - Generally retryable
    if (status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: 'MTN API server error',
        retryable: true,
        statusCode: status,
      };
    }

    // Network errors - Retryable
    if (error.code === 'ECONNABORTED' || error.code === 'ECONNREFUSED') {
      return {
        code: 'NETWORK_ERROR',
        message: 'Network timeout or connection refused',
        retryable: true,
        statusCode: 0,
      };
    }

    // Unknown error
    return {
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'Unknown error',
      retryable: false,
      statusCode: status || 500,
    };
  }
}
```

#### 2. Retry Strategy
**File:** `src/common/strategies/retry.strategy.ts`

```typescript
import { Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Exponential backoff retry strategy.
 * 
 * Usage:
 * await retry(() => mtnService.requestToPay(...), {maxAttempts: 3})
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const logger = new Logger('RetryStrategy');

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === opts.maxAttempts) {
        throw error; // Last attempt, give up
      }

      // Calculate backoff: 100ms, 200ms, 400ms
      const delay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs,
      );

      logger.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed, retrying in ${delay}ms: ${error.message}`,
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

#### 3. Update CollectionService
**File:** `src/modules/mtn/collection/collection.service.ts` - Add error handling

```typescript
// In requestToPay() catch block, replace:
catch (error) {
  this.logger.error(`[MTN COLLECTION] requestToPay error: ${error.message}`, error.stack);
  throw new BadRequestException('Failed to request to pay');
}

// With:
catch (error) {
  const mtnError = MtnErrorHandler.handle(error);
  this.logger.error(
    `[MTN COLLECTION] requestToPay error: ${mtnError.code} - ${mtnError.message}`,
    { code: mtnError.code, retryable: mtnError.retryable, statusCode: mtnError.statusCode }
  );

  // Map to appropriate HTTP status
  if (mtnError.statusCode === 422) {
    throw new BadRequestException(mtnError.message);
  }
  if (mtnError.statusCode >= 500) {
    throw new InternalServerErrorException(mtnError.message);
  }

  throw new BadRequestException(mtnError.message);
}
```

### Testing Phase 2.1

```bash
# Create test for error handling
# test/mtn-error.handler.spec.ts
# test/retry.strategy.spec.ts

# Run tests
yarn test mtn-error.handler.spec.ts
yarn test retry.strategy.spec.ts
```

---

## Phase 2.2: Webhook Security (6-8 hours)

### Files to Create

#### 1. Webhook Controller
**File:** `src/modules/payments/webhooks/webhook.controller.ts`

```typescript
import { Controller, Post, Get, Body, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';

@ApiTags('Webhooks')
@Controller('api/v1/webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * POST /webhooks/mtn
   * Receive payment status updates from MTN MoMo API.
   * 
   * Signature verification required:
   * X-Signature-256: HMAC-SHA256(webhook_secret, request_body)
   */
  @Post('mtn')
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiHeader({ name: 'X-Signature-256', description: 'HMAC signature (required)', required: true })
  async handleMtnWebhook(
    @Body() payload: any,
    headers: any,
  ): Promise<{ status: string }> {
    const signature = headers['x-signature-256'];
    
    if (!signature) {
      throw new BadRequestException('X-Signature-256 header required');
    }

    // Verify signature and process webhook
    await this.webhookService.processMtnWebhook(payload, signature);

    return { status: 'ok' };
  }

  /**
   * GET /webhooks/mtn/health
   * Check webhook endpoint health.
   */
  @Get('mtn/health')
  async getWebhookHealth(): Promise<{ status: string; lastProcessed: Date }> {
    return this.webhookService.getHealth();
  }
}
```

#### 2. Webhook Service
**File:** `src/modules/payments/webhooks/webhook.service.ts`

```typescript
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { MtnSignatureValidator } from './mtn-signature.validator';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private lastProcessed: Date = new Date();

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private configService: ConfigService,
  ) {}

  /**
   * Process MTN webhook callback.
   * 
   * Expected payload:
   * {
   *   "externalId": "...",
   *   "status": "SUCCESSFUL" or "FAILED",
   *   "amount": "1000",
   *   "payer": "260...",
   *   ...
   * }
   */
  async processMtnWebhook(payload: any, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('mtn.webhook_secret');

    // Verify signature
    const isValid = MtnSignatureValidator.verify(payload, signature, webhookSecret);
    if (!isValid) {
      this.logger.error(`[WEBHOOK] Invalid signature for payload: ${JSON.stringify(payload)}`);
      throw new BadRequestException('Invalid signature');
    }

    this.logger.log(`[WEBHOOK] Signature verified for externalId: ${payload.externalId}`);

    // Find payment by externalId
    const payment = await this.paymentRepository.findOne({
      where: { externalId: payload.externalId },
    });

    if (!payment) {
      this.logger.warn(`[WEBHOOK] Payment not found for externalId: ${payload.externalId}`);
      return; // Silently ignore (may be old/invalid ID)
    }

    // Update payment status
    if (payload.status === 'SUCCESSFUL') {
      payment.status = PaymentStatus.SUCCESSFUL;
    } else if (payload.status === 'FAILED') {
      payment.status = PaymentStatus.FAILED;
    }

    await this.paymentRepository.save(payment);
    this.lastProcessed = new Date();

    this.logger.log(
      `[WEBHOOK] Payment ${payment.id} updated to ${payment.status} for payer ${payment.payer}`,
    );
  }

  async getHealth(): Promise<{ status: string; lastProcessed: Date }> {
    return {
      status: 'ok',
      lastProcessed: this.lastProcessed,
    };
  }
}
```

#### 3. Signature Validator
**File:** `src/modules/payments/webhooks/mtn-signature.validator.ts`

```typescript
import { createHmac } from 'crypto';

export class MtnSignatureValidator {
  /**
   * Verify MTN webhook signature.
   * 
   * MTN sends: X-Signature-256: HMAC-SHA256(webhook_secret, request_body)
   * We compute: HMAC-SHA256(webhook_secret, received_body)
   * Compare: computed === received
   */
  static verify(payload: any, signature: string, webhookSecret: string): boolean {
    const body = JSON.stringify(payload);

    // Compute expected signature
    const computed = createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    // Constant-time comparison (prevent timing attacks)
    return this.timingSafeEqual(computed, signature);
  }

  /**
   * Compare two strings using constant time (prevent timing attacks).
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}
```

---

## Quick Implementation Checklist

- [ ] Apply idempotency migration (`yarn db:migrate`)
- [ ] Verify compilation (`yarn tsc --noEmit`)
- [ ] Start app and test idempotency (`yarn start:dev`)
- [ ] Create Phase 2.1 files (error handler, retry strategy)
- [ ] Update CollectionService with error handling
- [ ] Create Phase 2.2 files (webhook controller, service, validator)
- [ ] Update PaymentsModule to export webhook routes
- [ ] Write unit tests for all new services
- [ ] Integration test: Payment → Error → Retry → Success
- [ ] Integration test: Webhook signature validation
- [ ] Update environment variables documentation
- [ ] Update SWAGGER documentation

---

## Progress Tracking

**Phase 1 (Security):** ✅ Complete
- Idempotency ✅
- Tenant isolation ✅
- Rate limiting ✅
- Secrets ✅
- Audit logging ✅

**Phase 2.1 (Error Handling):** 🔄 Todo (8-12 hrs)
- Error classification
- Retry logic
- Backoff strategy

**Phase 2.2 (Webhook Security):** 🔄 Todo (6-8 hrs)
- Signature validation
- Status updates
- Health checks

**Testing:** 🔄 Todo (10-15 hrs)
- Unit tests
- Integration tests
- E2E tests

---

## Estimated Timeline

```
Today:       Phase 1 complete ✅
Tomorrow:    Phase 2.1 error handling (8-12 hrs)
Day 3:       Phase 2.2 webhook security (6-8 hrs)
Day 4:       Testing + QA (10-15 hrs)
Day 5:       Integration testing + staging deployment
```

**Ready for beta customers:** Day 5 (end of week)

---

## Questions?

Refer to:
- [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) - Complete roadmap
- [WHATS_LEFT.md](WHATS_LEFT.md) - All phases breakdown
- [IDEMPOTENCY_GUIDE.md](IDEMPOTENCY_GUIDE.md) - Idempotency deep dive

---

**Next Action:** Apply migrations and start Phase 2.1

```bash
cd /home/kangwa/Documents/Personal/gateway
yarn db:migrate
yarn start:dev
```

Good luck! 🚀
