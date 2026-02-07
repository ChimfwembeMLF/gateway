# Production Readiness - What's Left

**Summary:** Idempotency is now complete. Below is the prioritized checklist for full production readiness.

---

## Phase 2: Stability (Next 22-31 hours)

### 1. Error Handling & Retry Logic (🟡 8-12 hours)

**Problem:** MTN API can fail; clients need predictable retry behavior.

**Create:**
```
src/modules/mtn/
├── mtn-error.handler.ts          # Classify MTN errors (409=duplicate, 422=invalid, 500=retry)
├── mtn-error.dto.ts              # Error response structures

src/common/strategies/
├── retry.strategy.ts             # Exponential backoff: 100ms, 200ms, 400ms (max 3)

src/common/utils/
├── backoff.util.ts               # Utility functions for delay calculation
```

**Key:** Map provider-specific errors to client actions:
- `409 Conflict` → Duplicate request (idempotency worked!)
- `422 Unprocessable` → Invalid payer phone number (don't retry)
- `429 Too Many Requests` → Rate limited (retry with backoff)
- `503 Service Unavailable` → MTN down (retry with backoff)

---

### 2. Webhook Security (🟡 6-8 hours)

**Problem:** MTN sends callbacks; need to verify they're legitimate (not spoofed).

**Create:**
```
src/modules/payments/webhooks/
├── webhook.controller.ts         # POST /webhooks/mtn, GET /webhooks/mtn/health
├── webhook.service.ts            # Parse, validate, process MTN callbacks
├── mtn-signature.validator.ts    # Verify HMAC-SHA256 signature
├── webhook.dto.ts                # Request/response types
```

**Key:** Workflow:
```
MTN sends: 
POST /api/v1/webhooks/mtn
  X-Signature-256: HMAC-SHA256(webhook_secret, body)
  {
    "externalId": "...",
    "status": "SUCCESSFUL",
    "amount": "1000",
    "payer": "260..."
  }

Server:
  1. Verify signature matches webhook_secret
  2. Extract externalId, find Payment in DB
  3. Update Payment.status = SUCCESSFUL/FAILED
  4. Create audit log entry
  5. Return 200 OK (MTN stops retrying)
```

---

### 3. Enhanced Health Checks (🟡 2-3 hours)

**Problem:** Kubernetes needs to know if app is healthy.

**Update:**
```
src/modules/health/health.controller.ts
GET /health                      → {status: 'ok'}
GET /health/live                 → Database connected? (liveness)
GET /health/ready                → All services ready? (readiness)

Response:
{
  "status": "ok",
  "database": "connected",
  "mtn": "accessible",
  "uptime": 3600
}
```

---

### 4. Structured Logging with Pino (🟡 4-5 hours)

**Problem:** JSON logs are easier to parse in production.

**Install & Configure:**
```bash
npm install pino pino-pretty @nestjs/pino
```

**Create:**
```
src/config/logger.config.ts       # Pino configuration

Update:
src/app.module.ts                 # Add LoggerModule
```

**Output:**
```json
{"level":"info","time":"2026-02-04T10:30:45.123Z","msg":"Payment created","tenantId":"my-tenant","paymentId":"...","duration":"245ms"}
```

---

### 5. Request Timeouts Per Provider (🟡 2-3 hours)

**Problem:** MTN API can hang; need circuit breaker.

**Update:**
```
src/modules/mtn/collection/collection.service.ts
  MTN timeout: 10 seconds (API slow)

src/modules/mtn/disbursement/disbursement.service.ts  
  MTN timeout: 10 seconds

src/common/interceptors/
├── timeout.interceptor.ts        # Global timeout wrapper
```

---

## Phase 3: Observability (20-25 hours, Week 2)

### Circuit Breakers for MTN API
- Install `@nestjs/terminus`, `@js-sdsl/ordered-map`
- Fail gracefully when MTN API is down (return 503, not 500)

### Prometheus Metrics
- Request count per endpoint
- Payment success rate by provider
- API latency percentiles (p50, p95, p99)
- Error rates by type

### Request Correlation IDs
- Generate UUID per request
- Pass through all service calls
- Include in logs for debugging

---

## Phase 4: DevOps (15-20 hours, Week 3)

### CI/CD Pipeline
- GitHub Actions: lint → test → build → scan
- Docker hardening: non-root user, minimal image
- Automated image publish to registry

### Kubernetes Manifests
- Deployment with health probes
- Service, ConfigMap, Secret
- Ingress for routing

---

## Phase 5: Multi-Provider (25-30 hours, Week 4)

### Airtel Money Adapter
- Provider enum update
- AirtelCollectionService (same interface as MTN)
- Error mapping for Airtel-specific errors

### Zamtel Money Adapter
- Same pattern as Airtel

### Provider Switching
- Single /api/v1/payments endpoint
- Tenant config to specify preferred provider
- Fallback logic if primary provider fails

---

## Database Schema - Complete

```sql
-- Tenants (multi-tenancy)
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  apiKey VARCHAR UNIQUE NOT NULL,      -- ✅ Added: tenant_...
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL REFERENCES tenants,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  role ENUM('USER', 'ADMIN', 'SUPER_ADMIN'),
  createdAt TIMESTAMP DEFAULT NOW()
);

-- Payments (main transaction table)
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL REFERENCES tenants,           -- ✅ Critical
  externalId VARCHAR NOT NULL,                          -- Client-provided ID
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR DEFAULT 'ZMW',
  payer VARCHAR NOT NULL,                               -- Phone number
  flow ENUM('COLLECTION', 'DISBURSEMENT'),
  status ENUM('PENDING', 'SUCCESSFUL', 'FAILED'),
  momoTransactionId VARCHAR,                            -- MTN transaction ID
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX(tenantId),
  INDEX(externalId),
  UNIQUE(tenantId, externalId)                         -- Prevent dupe per tenant
);

-- Transactions (audit trail)
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL REFERENCES tenants,           -- ✅ Critical
  paymentId UUID NOT NULL REFERENCES payments,
  type ENUM('REQUEST_TO_PAY', 'STATUS_CHECK', ...),
  momoReferenceId VARCHAR,
  response TEXT,                                        -- MTN response JSON
  status ENUM('PENDING', 'SUCCESSFUL', 'FAILED'),
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX(tenantId)
);

-- Audit logs (security)
CREATE TABLE audits (
  id UUID PRIMARY KEY,
  tenantId UUID NOT NULL,                               -- ✅ Added: tenant isolation
  userId UUID REFERENCES users,
  entity VARCHAR NOT NULL,                              -- 'Payment', 'Tenant', etc.
  entityId VARCHAR NOT NULL,
  action VARCHAR NOT NULL,                              -- 'CREATE', 'UPDATE', 'DELETE'
  changes TEXT,                                         -- JSON diff
  ipAddress VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX(tenantId),
  INDEX(entity),
  INDEX(entityId)
);

-- Idempotency keys (prevent duplicates)
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY,
  tenantId VARCHAR NOT NULL,
  idempotencyKey VARCHAR NOT NULL,
  method VARCHAR NOT NULL,                              -- 'POST', 'GET'
  path VARCHAR NOT NULL,
  statusCode INT NOT NULL,
  responseBody TEXT NOT NULL,                           -- Serialized JSON
  createdAt TIMESTAMP DEFAULT NOW(),
  expiresAt TIMESTAMP NOT NULL,                         -- 24-hour TTL
  UNIQUE(tenantId, idempotencyKey),
  INDEX(expiresAt)
);
```

---

## Running Tests Before Production

```bash
# Run all tests
yarn test

# Run with coverage
yarn test --coverage

# Run specific test file
yarn test api-key.guard.spec.ts

# Watch mode for development
yarn test --watch

# Target coverage: > 80%
```

---

## Environment Variables - Complete List

**Database:**
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=gateway
DATABASE_USER=postgres
DATABASE_PASSWORD=<strong-password>
DATABASE_SYNCHRONIZE=false
```

**JWT:**
```env
JWT_SECRET=<min-32-chars-cryptographically-random>
JWT_EXPIRES_IN=1d
```

**MTN Integration:**
```env
MTN_BASE_URL=https://sandbox.momodeveloper.mtn.com  # or production URL
MTN_COLLECTION_API_USER=<from-mtn>
MTN_COLLECTION_SUBSCRIPTION_KEY=<from-mtn>
MTN_COLLECTION_PRIMARY_KEY=<from-mtn>
MTN_COLLECTION_TARGET_ENVIRONMENT=sandbox           # or production
MTN_DISBURSEMENT_API_USER=<from-mtn>
MTN_DISBURSEMENT_SUBSCRIPTION_KEY=<from-mtn>
MTN_DISBURSEMENT_PRIMARY_KEY=<from-mtn>
MTN_DISBURSEMENT_TARGET_ENVIRONMENT=sandbox
MTN_WEBHOOK_SECRET=<generate-secure-random>
```

**Rate Limiting:**
```env
THROTTLE_TTL=60000                # 60 seconds
THROTTLE_LIMIT=100                # 100 requests per TTL
```

**Logging:**
```env
LOG_LEVEL=info                    # debug, info, warn, error
NODE_ENV=development              # development, staging, production
```

**CORS:**
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com
```

**Misc:**
```env
PORT=3000
REDIS_URL=redis://localhost:6379  # Optional, for future caching
```

---

## Quick Wins (Easy Additions - 2-4 hours each)

1. **Input Validation** - Add class-validator decorators to DTOs
2. **Swagger/OpenAPI** - Already installed, just document endpoints
3. **CORS** - Already configured in app.module.ts
4. **Helmet** - Add security headers (1 line in main.ts)
5. **Environment Validation** - Fail fast on missing env vars

---

## Testing Roadmap

### Week 1 (Now)
- ✅ ApiKeyGuard tests (8 tests, complete)
- 🟡 IdempotencyService tests (5 tests) 
- 🟡 PaymentsService tests (10 tests)
- 🟡 CollectionService tests (8 tests)

### Week 2
- 🟡 Integration tests: Payment creation → MTN API → Webhook
- 🟡 Multi-tenant isolation tests
- 🟡 Rate limiting enforcement tests

### Week 3
- 🟡 E2E tests for complete payment flow
- 🟡 Contract tests for webhook handler
- 🟡 Load test against sandbox

---

## Deployment Checklist

- [ ] All tests passing (coverage > 80%)
- [ ] npm audit clean (no vulnerabilities)
- [ ] Migrations tested on staging DB
- [ ] Environment variables documented
- [ ] Database backups enabled
- [ ] Monitoring configured
- [ ] Team trained on runbooks
- [ ] Rollback plan documented

---

## Estimated Timeline

- **Phase 1 (Security):** ✅ Complete (40-60 hours done)
- **Phase 2 (Stability):** 🔄 Ready to start (22-31 hours, 3-4 days)
- **Phase 3 (Observability):** 📋 Planned (20-25 hours, 2-3 days)
- **Phase 4 (DevOps):** 📋 Planned (15-20 hours, 2-3 days)
- **Phase 5 (Multi-Provider):** 📋 Planned (25-30 hours, 3-4 days)

**Total to MVP:** ~120 hours (2-3 weeks for 1 developer, 1 week for 2-3)

---

## Next Action

Run migrations and start Phase 2:

```bash
# Apply idempotency migration
yarn db:migrate

# Start app
yarn start:dev

# Run existing tests
yarn test api-key.guard.spec.ts

# Begin Phase 2.1: Error handling implementation
# See PRODUCTION_READINESS_CHECKLIST.md for details
```

---

**Questions? Ask the team.**
**Last updated:** Feb 4, 2026
