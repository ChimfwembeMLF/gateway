# Production Readiness Checklist - Payment Gateway

**Status:** Phase 1 Complete | Phase 2 In Progress
**Last Updated:** Feb 4, 2026
**Responsible:** Engineering Team

---

## Quick Summary

This payment gateway is approaching production readiness. **Critical** items are implemented; **High** priority items are in progress; **Medium/Low** are documented for future phases.

### Critical (Must Complete Before Production Launch)
- ✅ **Idempotency** - Transaction wrappers to prevent duplicate payments
- ✅ **Multi-tenant Isolation** - tenantId on all entities, filtered queries, tenant-scoped API keys
- ✅ **Rate Limiting** - Global throttle (100 req/min) to prevent DoS
- ✅ **Secrets Management** - All credentials externalized to .env, no hardcoded values
- ✅ **Audit Logging** - Complete transaction history with tenant context
- ✅ **API Authentication** - Tenant API keys with header validation

### High Priority (Should Complete Before Public Beta)
- 🟡 **Error Handling & Retry Logic** - Provider error classification and exponential backoff
- 🟡 **Webhook Security** - Signature verification for incoming MTN callbacks
- 🟡 **Health Checks** - Readiness probes for orchestration platforms
- 🟡 **Structured Logging** - JSON logs with correlation IDs for debugging
- 🟡 **Request/Response Timeouts** - Configure per-provider timeouts

### Medium Priority (Nice to Have for V1)
- ⭕ **Monitoring & Alerting** - Prometheus metrics + Grafana dashboards
- ⭕ **CI/CD Pipeline** - Automated tests, linting, image signing
- ⭕ **Circuit Breakers** - Failover for MTN API downtime
- ⭕ **Request Correlation IDs** - Trace requests through system
- ⭕ **API Documentation** - OpenAPI/Swagger with examples

### Low Priority (Future Enhancements)
- ⭕ **Multi-provider Support** - Airtel, Zamtel adapters
- ⭕ **Webhook Replay** - Re-send failed webhooks
- ⭕ **Transaction Reversals** - Handle refunds and chargebacks
- ⭕ **Rate Limiting Per Tenant** - Custom limits per API key
- ⭕ **Advanced Analytics** - Payment trends, success rates

---

## Detailed Implementation Status

### 1. Idempotency (✅ COMPLETE)

**Purpose:** Prevent duplicate charges when client retries a failed request.

**Implementation:**
- `IdempotencyKey` entity stores request deduplication records
- `IdempotencyService` manages key lookup and response caching
- `IdempotencyInterceptor` transparently deduplicates on payment endpoints
- Database table `idempotency_keys` with 24-hour TTL

**How It Works:**
```
Client sends: POST /api/v1/payments with header Idempotency-Key: <uuid>

Request 1 (initial):
  → Interceptor checks IdempotencyKey table → Not found
  → Process payment normally (hits MTN API)
  → Save Idempotency-Key + response (HTTP 201)
  → Return to client

Network timeout / Client timeout:

Request 2 (retry, same Idempotency-Key):
  → Interceptor checks IdempotencyKey table → Found!
  → Return cached response immediately (HTTP 201, same payment data)
  → Skip MTN API call entirely → No duplicate charge ✅

Cleanup:
  → Cron job runs nightly to delete expired keys (>24 hours old)
```

**Usage:**
```bash
# Client code (Node.js)
import { v4 as uuidv4 } from 'uuid';

const idempotencyKey = uuidv4(); // Generate once

// Make payment - will retry with same key on failure
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    const response = await fetch('http://api/payments', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey, // Same key for retries!
        'x-api-key': 'tenant_...',
        'x-tenant-id': 'tenant-name'
      },
      body: JSON.stringify({amount: 1000, currency: 'ZMW', payer: '260...'})
    });
    return response;
  } catch (e) {
    if (attempt < 3) await sleep(100 * attempt); // Exponential backoff
  }
}
```

**Database Schema:**
```sql
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY,
  tenantId VARCHAR NOT NULL,
  idempotencyKey VARCHAR NOT NULL,
  method VARCHAR NOT NULL,          -- 'POST', 'GET', etc.
  path VARCHAR NOT NULL,            -- '/api/v1/payments'
  statusCode INT NOT NULL,
  responseBody TEXT NOT NULL,       -- Serialized JSON
  createdAt TIMESTAMP DEFAULT NOW(),
  expiresAt TIMESTAMP NOT NULL,     -- 24 hours from creation
  UNIQUE(tenantId, idempotencyKey)
);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expiresAt);
```

**Files:**
- `src/modules/payments/idempotency/idempotency-key.entity.ts` - Entity definition
- `src/modules/payments/idempotency/idempotency.service.ts` - Service logic
- `src/modules/payments/idempotency/idempotency.interceptor.ts` - Request interceptor
- `src/common/database/migrations/1770239000000-AddIdempotencyKeysTable.ts` - Schema migration

---

### 2. Error Handling & Retry Logic (🟡 IN PROGRESS)

**Current State:** Basic error handling in PaymentsService and CollectionService

**TODO:**
```typescript
// src/modules/mtn/collection/collection.error.handler.ts
// Handle MTN-specific errors:
// - 409 Conflict: Duplicate request (idempotency worked!)
// - 422 Unprocessable: Invalid payer phone number
// - 429 Too Many Requests: Rate limit hit, retry with backoff
// - 500+ Server Error: Retry with exponential backoff

// src/modules/payments/retry.strategy.ts
// Implement exponential backoff:
// retry 1: 100ms
// retry 2: 200ms
// retry 3: 400ms
// max: 3 retries
```

**Files to Create:**
- `src/modules/mtn/mtn-error.handler.ts`
- `src/common/strategies/retry.strategy.ts`
- `src/common/utils/backoff.util.ts`

---

### 3. Webhook Security (🟡 IN PROGRESS)

**Current State:** No webhook signature validation

**TODO:**
```typescript
// src/modules/payments/webhooks/webhook.controller.ts
// Endpoints:
// POST /api/v1/webhooks/mtn - Receive MTN callbacks
// GET /api/v1/webhooks/mtn/status - Webhook health

// Implement signature verification:
// MTN sends: X-Signature-256: HMAC-SHA256(webhook_secret, request_body)
// Server validates signature before processing

// src/modules/payments/webhooks/webhook.service.ts
// Parse MTN callback:
// {
//   "externalId": "50d8e2a3-ea73-4f75-9c5c-7e6c8ee4e8d5",
//   "status": "SUCCESSFUL",
//   "amount": "1000",
//   "currency": "ZMW",
//   "payer": "260..."
// }
// Update Payment.status in database
// Return 200 to MTN (retry if not 200)
```

**Files to Create:**
- `src/modules/payments/webhooks/webhook.controller.ts`
- `src/modules/payments/webhooks/webhook.service.ts`
- `src/modules/payments/webhooks/mtn-signature.validator.ts`

---

### 4. Health Checks (🟡 IN PROGRESS)

**Current State:** Basic `/health` endpoint exists

**TODO:**
```typescript
// Expand /health to include:
// - Database connection status
// - MTN API availability
// - Cache/Redis status
// - Disk space availability

// Kubernetes probes:
// livenessProbe: /health/live - App still running?
// readinessProbe: /health/ready - Ready for traffic?
```

**Files to Update:**
- `src/modules/health/health.controller.ts` - Add detailed checks
- `src/modules/health/health.service.ts` - Add provider checks

---

### 5. Structured Logging (🟡 IN PROGRESS)

**Current State:** NestJS Logger with console output

**TODO:**
```typescript
// Install: npm install pino pino-pretty @nestjs/pino
// 
// src/config/pino.config.ts
// {
//   level: process.env.LOG_LEVEL || 'info',
//   transport: {
//     target: 'pino-pretty',
//     options: { colorize: true }
//   }
// }
//
// Add to AppModule:
// LoggerModule.forRoot({ pinoHttp: pinoConfig })
//
// Structured output:
// {"level":"info","time":"2026-02-04T...","msg":"Payment created","tenantId":"...","paymentId":"..."}
```

**Files to Create:**
- `src/config/logger.config.ts`
- Update `src/app.module.ts` to use Pino

---

### 6. Request/Response Timeouts

**Current State:** Using axios defaults (no timeout set)

**TODO:**
```typescript
// src/modules/mtn/collection/collection.service.ts
// Add timeout per provider:
// MTN: 10 seconds (API can be slow)
// Airtel: 8 seconds
// Fallback: 5 seconds

// src/common/interceptors/timeout.interceptor.ts
// Cancel requests that exceed timeout
// Return 504 Gateway Timeout to client
// Store transaction as TIMEOUT status for manual review
```

**Files to Update:**
- `src/modules/mtn/collection/collection.service.ts` - Add timeout to axios.post()

---

### 7. Monitoring & Alerting (⭕ FUTURE)

**Components Needed:**
- Prometheus metrics export from `/metrics`
- Grafana dashboards for:
  - Request success rate
  - Payment success by provider
  - API latency percentiles
  - Error rates by type
- AlertManager rules:
  - Payment success rate < 95% → Alert
  - MTN API unavailable > 5 min → Alert
  - Database connection pool exhausted → Alert

**Files to Create:**
- `src/modules/metrics/metrics.controller.ts`
- `src/modules/metrics/metrics.service.ts`
- `k8s/prometheus-config.yaml`
- `k8s/alerting-rules.yaml`

---

### 8. CI/CD Pipeline (⭕ FUTURE)

**Components:**
```yaml
# .github/workflows/ci.yml
- Lint: ESLint + Prettier
- Test: Jest unit tests + coverage > 80%
- Build: Docker image creation
- Security: Trivy image scan
- Deploy: Push to registry
```

**Files to Create:**
- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml`
- `docker-compose.test.yml`
- `Makefile` for local dev

---

## Migration Path: Today → Production

### Phase 1: Critical Fixes (✅ DONE)
- ✅ Idempotency implementation
- ✅ Tenant isolation (all queries filtered by tenantId)
- ✅ Rate limiting
- ✅ Secrets externalization
- ✅ Audit logging

**Effort:** 40-60 hours | **Status:** Complete ✅

---

### Phase 2: Stability (🔄 IN PROGRESS)
- 🟡 Error handling & retry logic (8-12 hours)
- 🟡 Webhook security (6-8 hours)
- 🟡 Enhanced health checks (2-3 hours)
- 🟡 Structured logging with Pino (4-5 hours)
- 🟡 Request timeouts per provider (2-3 hours)

**Effort:** 22-31 hours | **Status:** Ready to start 🎯

---

### Phase 3: Observability (Coming Next)
- Circuit breakers for MTN API failures
- Prometheus metrics + Grafana
- Request correlation IDs

**Effort:** 20-25 hours | **Estimated Timeline:** Week 2

---

### Phase 4: DevOps (Coming Later)
- CI/CD pipeline (GitHub Actions)
- Automated testing
- Docker hardening
- Kubernetes deployment manifests

**Effort:** 15-20 hours | **Estimated Timeline:** Week 3

---

### Phase 5: Multi-Provider (Coming Later)
- Airtel Money adapter
- Zamtel Money adapter
- Provider switching logic

**Effort:** 25-30 hours | **Estimated Timeline:** Week 4

---

## Running Migrations

```bash
# Apply all pending migrations
yarn db:migrate

# Revert last migration
yarn db:migrate:revert

# Check migration status
yarn typeorm migration:show

# Create new migration
yarn db:migrate:create -- src/common/database/migrations/CreateFooTable
```

---

## Environment Variables Checklist

**Required for Development:**
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=gateway
DATABASE_USER=postgres
DATABASE_PASSWORD=...

JWT_SECRET=<min-32-chars>
JWT_EXPIRES_IN=1d

MTN_COLLECTION_API_USER=...(sandbox)
MTN_COLLECTION_SUBSCRIPTION_KEY=...
MTN_COLLECTION_PRIMARY_KEY=...

THROTTLE_TTL=60000
THROTTLE_LIMIT=100

LOG_LEVEL=debug
```

**Required for Production:**
- All above ENV vars
- Use production MTN API keys
- Strong JWT_SECRET (>32 chars, cryptographically random)
- Database backup configured
- Monitoring enabled (LOG_LEVEL=info or warn)

---

## Testing Checklist

Before declaring production-ready:

### Unit Tests (Phase 2)
- [ ] ApiKeyGuard (8 tests) - ✅ Complete
- [ ] IdempotencyService (5 tests) - Todo
- [ ] PaymentsService (10 tests) - Todo
- [ ] CollectionService (8 tests) - Todo

### Integration Tests (Phase 2)
- [ ] Payment creation with MTN API
- [ ] Webhook signature validation
- [ ] Multi-tenant data isolation
- [ ] Rate limiting enforcement

### E2E Tests (Phase 2)
- [ ] Complete payment flow: Create → Webhook → Update status
- [ ] Idempotency: Create payment, retry with same key
- [ ] Cross-tenant access prevention

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (coverage > 80%)
- [ ] No security vulnerabilities (npm audit clean)
- [ ] Environment variables configured
- [ ] Database backups enabled
- [ ] Monitoring/alerting configured
- [ ] Team trained on runbooks

### During Deployment
- [ ] Run migrations: `yarn db:migrate`
- [ ] Verify health checks: GET /health
- [ ] Smoke test: Create test payment
- [ ] Monitor logs for errors

### Post-Deployment
- [ ] Monitor error rate for 1 hour
- [ ] Test webhook delivery
- [ ] Verify audit logs contain transactions
- [ ] Have rollback plan ready

---

## Next Steps (Recommended)

1. **This Week:**
   - Implement error handling + retry logic (Phase 2.1)
   - Add webhook security (Phase 2.2)
   - Create integration tests

2. **Next Week:**
   - Add Pino structured logging
   - Implement circuit breakers
   - Setup monitoring + alerting

3. **Week After:**
   - Build CI/CD pipeline
   - Load test against MTN sandbox
   - Complete multi-provider support

---

## Support & Troubleshooting

### Common Issues

**Q: Payment created but MTN API failed - what's the status?**
A: Check Payment.status = PENDING and audit logs for the error. Use TenantController API-key endpoint to view transaction history.

**Q: Client retried payment, got different ID?**
A: Client didn't send Idempotency-Key header. Educate on required headers for production integrations.

**Q: MTN webhook never arrived?**
A: Check firewall/networking. Ensure webhook URL is publicly accessible. Implement webhook retry/replay mechanism.

**Q: Rate limiting too strict?**
A: Configure THROTTLE_LIMIT and THROTTLE_TTL in .env. Consider per-tenant limits (Phase 2).

---

**Questions?** Reach out to engineering team.
**Last reviewed:** Feb 4, 2026
**Next review:** Feb 11, 2026
