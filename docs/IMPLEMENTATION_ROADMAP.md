# Security Fixes Implementation Roadmap
## Phases 2-6 (Testing, Logging, Validation)

**Date**: February 5, 2026  
**Status**: Phase 1 (Security Fixes) ✅ Complete | Phases 2-6 Ready to Execute  
**Estimated Remaining Time**: 60-100 hours

---

## Executive Summary

**Phase 0-1 Status**: ✅ 95% COMPLETE
- ✅ Audit entity has tenantId with index
- ✅ AuditSubscriber extracts tenantId automatically  
- ✅ AuditController filters by tenantId
- ✅ ThrottlerModule configured with rate limiting
- ✅ All secrets externalized to environment variables

**Remaining Critical Work** (Phases 2-6):
1. **Phase 2**: Test infrastructure & baseline coverage (8-12 hours)
2. **Phase 3**: Unit tests for critical paths (40-60 hours) 
3. **Phase 4**: E2E tests & integration scenarios (12-16 hours)
4. **Phase 5**: Structured logging with Pino (8-12 hours)
5. **Phase 6**: Final validation & documentation (4-8 hours)

---

## Phase 2: Test Setup & Baseline Coverage (8-12 hours)

### 2.1: Run Baseline Coverage Report ⏱️ 1 hour

**Objective**: Get current test coverage baseline

```bash
cd /home/kangwa/Documents/Personal/gateway
yarn test:cov
```

**Deliverables**:
- Coverage report in `coverage/` directory
- Identify services with 0% coverage
- Document baseline metrics

### 2.2: Create Test Utilities & Helpers ⏱️ 3-4 hours

**Files to Create**:

1. `test/unit/setup.ts` - Jest setup for unit tests
2. `test/unit/test.utils.ts` - Common test utilities
3. Enhance `test/helpers/test-app.helper.ts` - Add more setup methods
4. Enhance `test/helpers/mock.helpers.ts` - Add mock factories

**Key Components**:
```typescript
// test/unit/setup.ts
export const createTestingModule = (imports: any[]) => {
  return Test.createTestingModule({ imports }).compile();
};

// test/unit/test.utils.ts
export const generateTestPaymentDto = () => ({...});
export const generateTestTenantDto = () => ({...});
export const generateTestUserDto = () => ({...});
```

### 2.3: Setup Test Database ⏱️ 2-3 hours

**Objective**: Isolated test database for E2E tests

**Steps**:
1. Create `test/jest-e2e-unit.json` for unit tests config
2. Add test database connection string to CI/CD config
3. Create `test/database/seed.ts` for test data
4. Document test database setup in `docs/testing.md`

### 2.4: Create Test Documentation ⏱️ 1-2 hours

**Files**:
- `docs/testing.md` - Testing strategy & guidelines
- `docs/test-coverage-targets.md` - Coverage goals per service
- `.github/TESTING_CHECKLIST.md` - PR testing requirements

---

## Phase 3: Unit Tests (40-60 hours) 🔴 CRITICAL

### High-Priority Services (P0 - 30-40 hours)

#### 3.1: PaymentsService Tests ⏱️ 8-10 hours

**File**: `src/modules/payments/payments.service.spec.ts`

**Test Scenarios**:
- ✅ Happy path: Create payment for MTN
- ✅ Happy path: Create payment for AIRTEL (new)
- ✅ Happy path: Get payment status
- ✅ Error: Invalid provider
- ✅ Error: Insufficient tenant balance (future)
- ✅ Tenant isolation: Tenant A can't see Tenant B's payments
- ✅ Idempotency: Same request twice returns same result
- ✅ Database: Payment + Transaction records created
- ✅ Audit: Audit entry created on payment creation

**Target Coverage**: 85%

#### 3.2: CollectionService Tests (MTN) ⏱️ 8-10 hours

**File**: `src/modules/mtn/collection/collection.service.spec.ts`

**Test Scenarios**:
- ✅ requestToPay: Generate correct API request
- ✅ requestToPay: Handle MTN API responses
- ✅ getRequestToPayStatus: Query transaction status
- ✅ Error handling: MTN API timeouts
- ✅ Error handling: Invalid phone number
- ✅ Webhook: Process MTN callback correctly
- ✅ Webhook: Idempotency (duplicate webhook)
- ✅ Reconciliation: Sync pending payments

**Target Coverage**: 80%

#### 3.3: DisbursementService Tests (MTN) ⏱️ 8-10 hours

**File**: `src/modules/mtn/disbursement/disbursement.service.spec.ts`

**Test Scenarios**:
- ✅ transfer: Generate correct API request
- ✅ transfer: Handle MTN API responses
- ✅ getAccountBalance: Retrieve balance
- ✅ validateAccountHolderStatus: Verify account
- ✅ Error: Insufficient balance
- ✅ Error: Account not active
- ✅ Idempotency: Duplicate transfers prevented

**Target Coverage**: 75%

### Medium-Priority Services (P1 - 8-12 hours)

#### 3.4: ApiKeyGuard Tests ⏱️ 3-4 hours

**File**: `src/common/guards/api-key.guard.spec.ts` (enhance existing)

**Test Scenarios**:
- ✅ Valid API key: Request allowed
- ✅ Missing API key: Rejected
- ✅ Invalid API key: Rejected
- ✅ TenantId mismatch: Rejected (tenant isolation)
- ✅ Tenant cannot access other tenant's API key

**Target Coverage**: 95%

#### 3.5: AuditService Tests ⏱️ 2-3 hours

**File**: `src/modules/audit/audit.service.spec.ts`

**Test Scenarios**:
- ✅ findAll: Returns only tenant's audits
- ✅ findByEntity: Returns audits for specific entity
- ✅ create: Creates audit record with all fields
- ✅ Audit includes tenantId

**Target Coverage**: 90%

#### 3.6: TenantService Tests ⏱️ 2-3 hours

**File**: `src/modules/tenant/tenant.service.spec.ts`

**Test Scenarios**:
- ✅ Create tenant: Isolates from other tenants
- ✅ Get tenant: Returns only own tenant data
- ✅ Update tenant: Affects only own tenant
- ✅ Error: Cannot access other tenant's data

**Target Coverage**: 85%

### Lower-Priority Services (P2 - 2-4 hours)

- AuthService.spec.ts
- UserService.spec.ts
- HealthService.spec.ts

---

## Phase 4: E2E Tests (12-16 hours)

### 4.1: Multi-Tenant Isolation Tests ⏱️ 4-6 hours

**File**: `test/multi-tenant-isolation.e2e-spec.ts` (new)

**Scenarios**:
```
Scenario 1: Tenant A & B both create payments
  - Verify Tenant A can only query their payments
  - Verify Tenant B cannot access Tenant A's payments
  - Verify Audit logs are isolated per tenant

Scenario 2: Auth isolation
  - Tenant A user cannot use Tenant B's API key
  - Tenant A user can only manage Tenant A users

Scenario 3: Billing isolation
  - Each tenant has separate usage metrics
  - Invoice generation isolated per tenant
```

### 4.2: Payment Flow E2E Tests ⏱️ 4-5 hours

**File**: `test/payment-flow.e2e-spec.ts` (enhance existing)

**Scenarios**:
```
Scenario: Complete MTN Payment Flow
  1. User creates payment request
  2. System calls MTN API (mocked)
  3. Payment status set to PENDING
  4. Webhook callback received
  5. Payment status updated to SUCCESSFUL
  6. Invoice generated
  7. Audit logs created
  8. Usage metrics tracked

Scenario: Payment Error Handling
  1. MTN API timeout
  2. Payment status remains PENDING (retry logic)
  3. Error logged with correlation ID
```

### 4.3: Authorization & RBAC Tests ⏱️ 2-3 hours

**File**: `test/authorization.e2e-spec.ts` (new)

**Scenarios**:
```
Scenario: API Key Guard
  - Admin can access all endpoints
  - Regular user limited to own data
  - Public endpoints accessible without key

Scenario: Role-Based Access
  - SUPER_ADMIN: Full access
  - ADMIN: Tenant-level access
  - USER: Own data only
```

### 4.4: Error & Edge Cases ⏱️ 2-3 hours

**File**: `test/error-handling.e2e-spec.ts` (new)

**Scenarios**:
```
Rate Limiting:
  - 101 requests in 60 seconds → 429 response
  - Retry-After header included

Validation:
  - Invalid phone number → 400 error
  - Missing required fields → 400 error

Idempotency:
  - Same payment twice → Only charged once
  - X-Idempotency-Key header required
```

---

## Phase 5: Structured Logging (8-12 hours)

### 5.1: Install & Configure Pino ⏱️ 2-3 hours

**Steps**:
```bash
# Install Pino
yarn add nestjs-pino pino pino-http pino-pretty

# Install types
yarn add -D @types/pino
```

**Files to Create**:
- `src/config/logging.config.ts` - Pino configuration
- `docs/logging.md` - Logging guidelines

**Configuration**:
```typescript
// src/config/logging.config.ts
import { LoggerService } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import pino from 'pino';

export const createPinoLogger = (): Logger => {
  const pinoLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: process.env.NODE_ENV === 'production' 
        ? 'pino/file'
        : 'pino-pretty',
      options: {
        singleLine: process.env.NODE_ENV === 'production',
        colorize: process.env.NODE_ENV !== 'production',
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  });
  
  return new Logger({ pinoHttp: { logger: pinoLogger } });
};
```

### 5.2: Replace console.log Statements ⏱️ 3-4 hours

**Steps**:
1. Search all `console.log` statements:
   ```bash
   grep -r "console.log" src/ --include="*.ts"
   ```

2. Create logger injection pattern:
   ```typescript
   private readonly logger = this.loggingService.getLogger(ServiceName);
   ```

3. Replace patterns:
   - `console.log()` → `logger.info()`
   - `console.error()` → `logger.error()`
   - `console.warn()` → `logger.warn()`

**Target**: Zero `console.log` in production code

### 5.3: Add Request Correlation IDs ⏱️ 2-3 hours

**Files**:
- Enhance `src/common/middleware/logging.middleware.ts`
- Add `X-Request-ID` header support

**Implementation**:
```typescript
// src/common/middleware/logging.middleware.ts
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.get('X-Request-ID') || generateUUID();
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}
```

**Logging Pattern**:
```typescript
logger.info(
  {
    requestId: req.id,
    tenantId: req.user?.tenantId,
    userId: req.user?.userId,
    path: req.path,
    method: req.method,
    duration: Date.now() - req.startTime,
  },
  'Request completed'
);
```

### 5.4: Add Structured Log Fields ⏱️ 1-2 hours

**Required Fields for All Logs**:
- `requestId` - Correlation ID
- `tenantId` - Tenant identifier
- `userId` - User identifier  
- `timestamp` - ISO 8601 format
- `level` - debug/info/warn/error
- `service` - Service name
- `operation` - What operation was performed
- `duration` - Operation duration in ms
- `status` - Success/failure

**Example Log Output**:
```json
{
  "timestamp": "2026-02-05T18:00:00.000Z",
  "level": 30,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "tenant-123",
  "userId": "user-456",
  "service": "PaymentsService",
  "operation": "createPayment",
  "provider": "MTN",
  "amount": 1000,
  "currency": "ZMW",
  "status": "success",
  "duration": 245,
  "msg": "Payment created successfully"
}
```

---

## Phase 6: Final Validation & Documentation (4-8 hours)

### 6.1: Run Full Test Suite ⏱️ 1 hour

```bash
# Run all tests
yarn test

# Run with coverage
yarn test:cov

# Run E2E tests
yarn test:e2e
```

**Acceptance Criteria**:
- ✅ All tests pass
- ✅ Coverage >80% overall
- ✅ Coverage >85% on critical services
- ✅ Suite completes in <3 minutes

### 6.2: Security Checklist ⏱️ 1 hour

**Verify**:
- ✅ No hardcoded secrets in code
- ✅ No secrets in `.env.example`
- ✅ No PII in logs (phone numbers, API keys masked)
- ✅ Tenant isolation enforced in all queries
- ✅ Rate limiting active on all endpoints
- ✅ API key validation on protected routes

### 6.3: Documentation Updates ⏱️ 1-2 hours

**Files to Update/Create**:
- `docs/testing.md` - Testing guidelines
- `docs/logging.md` - Logging standards
- `docs/security.md` - Security practices
- `TESTING_CHECKLIST.md` - PR requirements
- `README.md` - Update status section

### 6.4: Performance Validation ⏱️ 1-2 hours

**Metrics**:
- API latency: <100ms p95
- Rate limiting overhead: <10ms
- Audit writes: Async, non-blocking
- Log write performance: <5ms per log

**Testing**:
```bash
# Load test (k6 or Artillery)
k6 run test/load/basic-load.js
```

### 6.5: Constitution Re-check ⏱️ 1 hour

**Verify All Principles**:
1. ✅ Multi-Tenancy First: Audit isolation, filters
2. ✅ Security-First: Rate limiting, secrets external
3. ✅ Testing & Quality Gates: >80% coverage
4. ✅ API First: Documented endpoints
5. ✅ Audit Trail: Structured logging

---

## Implementation Timeline

```
Week 1 (40 hours):
  Mon: Phase 2 - Test setup & baseline (8h)
  Tue-Wed: Phase 3.1-3.2 - Payment & Collection tests (16h)
  Thu-Fri: Phase 3.3-3.4 - Disbursement & Guard tests (12h)
  Fri: Phase 3.5-3.6 - Audit & Tenant tests (4h)

Week 2 (30 hours):
  Mon-Tue: Phase 4 - E2E tests (12h)
  Wed-Thu: Phase 5 - Logging implementation (12h)
  Fri: Phase 6 - Validation & docs (6h)

Total: ~70 hours of focused development
```

---

## Success Criteria

### Test Coverage Targets
- Overall: >80%
- PaymentsService: >85%
- CollectionService: >80%
- DisbursementService: >75%
- ApiKeyGuard: >95%
- AuditService: >90%
- TenantService: >85%

### Test Suite Performance
- Unit tests: <2 minutes
- E2E tests: <5 minutes
- Full suite: <10 minutes

### Logging Completeness
- Zero `console.log` statements
- All critical paths logged
- Request correlation IDs on 100% of requests
- Structured JSON output in production

### Security Posture
- Zero hardcoded secrets
- 100% of queries filtered by tenantId
- Rate limiting active
- Zero PII in logs

---

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Test suite too slow | Use parallel execution (jest --maxWorkers=4) |
| Incomplete coverage | Focus on critical paths first, iterate |
| Logging perf impact | Use async writes, benchmark before/after |
| Database test isolation | Use transactions, rollback after each test |

---

**Next Step**: Proceed to Phase 2 - Test Setup & Baseline Coverage
