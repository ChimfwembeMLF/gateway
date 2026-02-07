# Implementation Plan: Production Readiness - Critical Security & Compliance Fixes

**Branch**: `002-security-fixes` | **Date**: February 4, 2026 | **Spec**: [spec.md](./spec.md)

## Summary

This plan addresses **5 critical constitutional violations** blocking production deployment:
1. Audit entity missing `tenantId` (tenant isolation breach)
2. Rate limiting not activated (DoS vulnerability)
3. Hardcoded credentials in config files
4. Test coverage <10% (vs. 80% target)
5. Structured logging not implemented

**Technical Approach**: Schema migration for Audit entity, ThrottlerModule configuration, environment variable refactoring, comprehensive test suite development, Pino logging integration.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20  
**Framework**: NestJS 10.x  
**Primary Dependencies**: TypeORM 0.3.x, @nestjs/throttler 5.x, Pino 8.x, Jest 29.x  
**Storage**: PostgreSQL 15 with TypeORM migrations  
**Testing**: Jest (unit), Supertest (E2E), @nestjs/testing  
**Target Platform**: Docker containerized Linux server  
**Project Type**: Backend API (NestJS microservice architecture)  
**Performance Goals**: <100ms p95 API latency, rate limiting <10ms overhead, audit writes async  
**Constraints**: Zero downtime deployment, backward compatible migrations, <2min test suite  
**Scale/Scope**: Multi-tenant SaaS, 100+ tenants, 10k+ payments/day, 50k+ audit logs/day

---

## Constitution Check

**Status**: ❌ **BLOCKING VIOLATIONS** - Cannot proceed to production

| Principle | Status | Violation | Resolution in This Plan |
|-----------|--------|-----------|------------------------|
| **Multi-Tenancy First** | ❌ FAIL | Audit entity missing `tenantId` | Phase 1: Add tenantId column with migration |
| **Security-First** | ❌ FAIL | Rate limiting not activated | Phase 1: Configure ThrottlerModule |
| **Security-First** | ❌ FAIL | Hardcoded credentials in config | Phase 1: Externalize all secrets |
| **Testing & Quality Gates** | ❌ FAIL | <10% coverage vs. >80% target | Phase 2-3: Comprehensive test suite |
| **Audit Trail** | ⚠️ PARTIAL | Structured logging missing | Phase 3: Implement Pino |

**Re-check Required**: After Phase 1 (security fixes), Phase 3 (testing)

---

## Project Structure

### Documentation (this feature)

```text
.specify/002-security-fixes/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (implementation plan)
├── tasks.md             # Task breakdown (next: /speckit.tasks)
└── migrations/          # Database migration artifacts
    └── add-audit-tenant-id.ts
```

### Source Code (repository root)

```text
src/
├── modules/
│   ├── audit/
│   │   ├── entities/
│   │   │   └── audit.entity.ts          # [MODIFY] Add tenantId field
│   │   ├── audit.subscriber.ts          # [MODIFY] Extract tenantId from entities
│   │   ├── audit.service.ts             # [MODIFY] Add tenant filtering
│   │   └── audit.controller.ts          # [NEW] Query endpoint with tenant filter
│   ├── payments/
│   │   ├── payments.service.spec.ts     # [NEW] Unit tests
│   │   └── payments.e2e-spec.ts         # [NEW] E2E tests
│   └── tenant/
│       └── tenant.service.spec.ts       # [NEW] Tenant isolation tests
├── common/
│   ├── guards/
│   │   └── api-key.guard.spec.ts        # [ENHANCE] Add tenant mismatch tests
│   └── interceptors/
│       └── logging.interceptor.ts       # [NEW] Request correlation IDs
├── config/
│   ├── default.yaml                     # [MODIFY] Remove all secrets
│   └── configuration.ts                 # [NEW] Env validation schema
└── main.ts                              # [MODIFY] Add ThrottlerModule, Pino

database/
└── migrations/
    └── 1738700000000-AddAuditTenantId.ts  # [NEW] Migration

config/
├── default.yaml                         # [MODIFY] Remove secrets
├── development.yaml                     # [MODIFY] Remove secrets
├── production.yaml                      # [MODIFY] Remove secrets
└── staging.yaml                         # [MODIFY] Remove secrets

test/
├── unit/
│   ├── api-key-guard.spec.ts           # [ENHANCE] Tenant isolation
│   ├── payments.service.spec.ts         # [NEW] Payment logic
│   └── tenant.service.spec.ts           # [NEW] Tenant queries
├── integration/
│   └── mtn-collection.spec.ts           # [NEW] MTN API flow
└── e2e/
    ├── multi-tenant.e2e-spec.ts         # [NEW] Cross-tenant isolation
    └── rate-limiting.e2e-spec.ts        # [NEW] Throttling behavior

# New files
.env.example                             # [NEW] Template for secrets
jest.config.js                           # [MODIFY] Coverage thresholds
```

**Structure Decision**: NestJS modular monolith with TypeORM. Audit entity modified in-place. Tests organized by type (unit/integration/e2e) following NestJS conventions.

---

## Phase 0: Research & Prerequisites *(Parallel)*

**Goal**: Validate technical approach, identify migration risks, select logging library

### Research Tasks
1. **Audit Migration Strategy**
   - Review existing Audit table data (est. row count, tenantId backfill strategy)
   - Validate TypeORM migration syntax for adding non-nullable column with default
   - Decision: Use `DEFAULT 'SYSTEM'` for existing rows, then remove default

2. **Rate Limiting Strategy**
   - Research ThrottlerModule storage options (in-memory vs. Redis)
   - Decision: Start with in-memory, document Redis migration path
   - Determine rate limits: 100 req/min per tenant, 10 req/min for auth endpoints

3. **Logging Library Selection**
   - Compare Pino vs. Winston (performance, NestJS integration, JSON output)
   - Decision: **Pino** (faster, smaller bundle, native JSON, nestjs-pino package)

4. **Test Coverage Strategy**
   - Analyze codebase complexity (lines per service, cyclomatic complexity)
   - Identify critical paths: PaymentsService.create, ApiKeyGuard.canActivate, TenantService queries
   - Set realistic targets: 80% critical services, 60% overall

### Prerequisites Checklist
- [ ] PostgreSQL test database available for migration testing
- [ ] `.env.example` reviewed by security team
- [ ] Jest coverage configuration validated
- [ ] Pino logger compatibility verified with NestJS 10.x

**Estimated Duration**: 4-6 hours (can run parallel with Phase 1 setup)

---

## Phase 1: Critical Security Fixes *(Sequential)*

**Goal**: Resolve all P0 constitutional violations (Audit tenantId, rate limiting, secrets)

### 1.1 Audit Entity - Add TenantId *(Blocking)*

**Files Modified**:
- `src/modules/audit/entities/audit.entity.ts`
- `src/modules/audit/audit.subscriber.ts`
- `database/migrations/TIMESTAMP-AddAuditTenantId.ts`

**Implementation Steps**:
1. Create TypeORM migration: `yarn typeorm migration:create AddAuditTenantId`
2. Add `tenantId` column:
   ```typescript
   @Column({ nullable: false })
   @Index()
   tenantId: string;
   ```
3. Migration logic:
   - Add column as nullable first
   - Backfill existing rows with `'SYSTEM'` tenantId (or extract from auditableId)
   - Set NOT NULL constraint
4. Update AuditSubscriber to extract `tenantId` from entity being audited
5. Add fallback for system entities (Tenant itself): use `'SYSTEM'` or skip

**Testing**:
- Run migration on test database
- Verify existing audit logs have tenantId = 'SYSTEM'
- Create new payment, verify audit log has correct tenantId
- Query audits filtered by tenantId, verify isolation

**Acceptance Criteria**:
- ✅ All audit records have non-null tenantId
- ✅ New audits automatically include entity's tenantId
- ✅ Migration rollback works correctly

---

### 1.2 Rate Limiting - Activate ThrottlerModule *(Blocking)*

**Files Modified**:
- `src/app.module.ts`
- `src/main.ts` (if global guard needed)
- `src/modules/auth/auth.controller.ts` (custom limits)

**Implementation Steps**:
1. Import and configure ThrottlerModule in AppModule:
   ```typescript
   ThrottlerModule.forRoot([{
     ttl: 60000,  // 60 seconds
     limit: 100,   // 100 requests per minute per tenant
   }])
   ```
2. Apply global ThrottlerGuard or per-controller
3. Add custom limits for auth endpoints:
   ```typescript
   @Throttle({ default: { limit: 10, ttl: 60000 }})  // 10/min for login
   ```
4. Exclude health check endpoint from throttling
5. Consider tenant-scoped throttling (use custom storage if needed)

**Testing**:
- Write E2E test: make 101 requests, verify 101st returns 429
- Test per-tenant isolation: Tenant A hits limit, Tenant B unaffected
- Test excluded endpoints (health check)

**Acceptance Criteria**:
- ✅ Rate limiting active on all protected endpoints
- ✅ 429 response includes `Retry-After` header
- ✅ Health check excluded from rate limiting

---

### 1.3 Secrets Externalization *(Blocking)*

**Files Modified**:
- `config/default.yaml`, `development.yaml`, `production.yaml`, `staging.yaml`
- `src/config/configuration.ts` (new validation schema)
- `.env.example` (new file)
- `README.md`, `INTEGRATION_GUIDE.md`

**Implementation Steps**:
1. Create `.env.example` with all required variables:
   ```bash
   # Database
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=
   DATABASE_NAME=gateway
   
   # JWT
   JWT_SECRET=
   JWT_EXPIRES_IN=3600
   
   # MTN MoMo Collection
   MTN_COLLECTION_SUBSCRIPTION_KEY=
   MTN_COLLECTION_TARGET_ENVIRONMENT=sandbox
   MTN_COLLECTION_X_REFERENCE_ID=
   MTN_COLLECTION_API_KEY=
   
   # MTN MoMo Disbursement
   MTN_DISBURSEMENT_SUBSCRIPTION_KEY=
   # ... etc
   ```

2. Remove all hardcoded secrets from `config/*.yaml`:
   ```yaml
   mtn:
     collection:
       subscription_key: ${MTN_COLLECTION_SUBSCRIPTION_KEY}
       # Remove actual key value
   ```

3. Add validation in `configuration.ts`:
   ```typescript
   import { validateSync } from 'class-validator';
   
   class EnvironmentVariables {
     @IsNotEmpty() DATABASE_HOST: string;
     @IsNotEmpty() MTN_COLLECTION_SUBSCRIPTION_KEY: string;
     // ... etc
   }
   ```

4. Update README with environment setup instructions

**Testing**:
- Start app without env vars, verify fails with clear error
- Start app with env vars from `.env.example`, verify MTN API calls work
- Verify no secrets in `git log` (use git-secrets tool)

**Acceptance Criteria**:
- ✅ Zero secrets in `config/*.yaml` files
- ✅ App fails fast with helpful error if env var missing
- ✅ `.env.example` documents all required variables
- ✅ Security team approves

---

## Phase 2: Test Infrastructure Setup *(Parallel)*

**Goal**: Establish testing patterns, configure coverage reporting

### 2.1 Test Configuration & Coverage Reporting

**Files Modified**:
- `jest.config.js`
- `package.json`

**Implementation Steps**:
1. Configure Jest coverage thresholds:
   ```javascript
   coverageThreshold: {
     global: {
       branches: 60,
       functions: 60,
       lines: 60,
       statements: 60,
     },
     './src/modules/payments/': {
       branches: 80,
       functions: 80,
       lines: 80,
       statements: 80,
     },
     './src/common/guards/': {
       branches: 80,
       functions: 80,
       lines: 80,
       statements: 80,
     },
   }
   ```

2. Add test scripts:
   ```json
   "test:cov": "jest --coverage",
   "test:watch": "jest --watch",
   "test:cov:html": "jest --coverage --coverageReporters=html",
   ```

3. Configure VS Code test runner (optional)

**Acceptance Criteria**:
- ✅ `yarn test:cov` generates coverage report
- ✅ Coverage thresholds enforced (build fails if not met)

---

### 2.2 Test Utilities & Factories

**Files Created**:
- `test/utils/test-helpers.ts`
- `test/factories/tenant.factory.ts`
- `test/factories/user.factory.ts`
- `test/factories/payment.factory.ts`

**Implementation Steps**:
1. Create test database helper:
   ```typescript
   export async function createTestingModule(imports) {
     return Test.createTestingModule({ imports }).compile();
   }
   ```

2. Create entity factories:
   ```typescript
   export const createMockTenant = (overrides?) => ({
     id: uuid(),
     name: 'test-tenant',
     ...overrides,
   });
   ```

3. Create mock service helpers

**Acceptance Criteria**:
- ✅ Factories reduce test boilerplate
- ✅ Test database cleanup automatic

---

## Phase 3: Unit & Integration Tests *(Parallel)*

**Goal**: Achieve >80% coverage on critical services, >60% overall

### 3.1 Critical Service Unit Tests

**Priority Order** (based on risk):
1. **ApiKeyGuard.canActivate** (security critical)
2. **PaymentsService.create** (financial critical)
3. **TenantService.findByNameOrId** (isolation critical)
4. **AuditSubscriber** (compliance critical)

**Files Created**:
- `src/common/guards/api-key.guard.spec.ts` (enhance existing)
- `src/modules/payments/payments.service.spec.ts`
- `src/modules/tenant/tenant.service.spec.ts`
- `src/modules/audit/audit.subscriber.spec.ts`

**Test Scenarios per Service**:

**ApiKeyGuard**:
- ✅ Valid API key + matching tenantId → allow
- ✅ Valid API key + wrong tenantId → reject
- ✅ Missing API key → reject
- ✅ Missing x-tenant-id header → reject
- ✅ Tenant name resolution (case-insensitive)
- ✅ Invalid tenant UUID → reject

**PaymentsService**:
- ✅ MTN requestToPay success → Payment created with PENDING status
- ✅ MTN API error (NOT_ENOUGH_FUNDS) → throw BadRequestException with user message
- ✅ ExternalId uniqueness → prevent duplicates
- ✅ Tenant isolation → tenantId stored correctly
- ✅ Transaction record created

**TenantService**:
- ✅ Find by UUID → returns tenant
- ✅ Find by name (case-insensitive) → returns tenant
- ✅ Non-existent tenant → returns null
- ✅ Create tenant with admin → both entities created

**Acceptance Criteria**:
- ✅ All critical services have >80% coverage
- ✅ All edge cases from spec covered

---

### 3.2 Integration Tests - Payment Flow

**Files Created**:
- `test/integration/mtn-collection.spec.ts`

**Test Scenarios**:
1. End-to-end MTN requestToPay (with mocked MTN API)
2. Payment status polling
3. Webhook callback handling (if implemented)
4. Error scenarios (timeout, network error)

**Acceptance Criteria**:
- ✅ Happy path: create payment → poll status → status updates
- ✅ Error path: MTN error → payment marked FAILED
- ✅ Uses test database (transactions, rollback)

---

## Phase 4: E2E & Multi-Tenant Tests *(Sequential)*

**Goal**: Verify tenant isolation end-to-end

### 4.1 Multi-Tenant Isolation E2E Tests

**Files Created**:
- `test/e2e/multi-tenant.e2e-spec.ts`

**Test Scenarios**:
1. **Tenant A creates payment, Tenant B cannot access**
   - Tenant A: POST /payments → get paymentId
   - Tenant B: GET /payments/:paymentId → 404 or 403

2. **Tenant A user cannot use Tenant B's API key**
   - Try API key swap → UnauthorizedException

3. **Audit logs isolated**
   - Tenant A: GET /audits → only sees their audits

4. **User username collision across tenants**
   - Tenant A: register "admin"
   - Tenant B: register "admin" → both succeed (different tenants)

**Acceptance Criteria**:
- ✅ All cross-tenant access attempts blocked
- ✅ No data leakage via API
- ✅ Tests run in isolated database

---

### 4.2 Rate Limiting E2E Tests

**Files Created**:
- `test/e2e/rate-limiting.e2e-spec.ts`

**Test Scenarios**:
1. Exceed rate limit → 429 response
2. Retry-After header present
3. Rate limit resets after TTL
4. Per-tenant isolation (Tenant A limit doesn't affect B)

**Acceptance Criteria**:
- ✅ 429 returned after limit exceeded
- ✅ Request succeeds after TTL expires

---

## Phase 5: Structured Logging *(Parallel with Phase 3-4)*

**Goal**: Implement Pino with correlation IDs

### 5.1 Pino Logger Setup

**Files Modified/Created**:
- `src/main.ts` (replace default logger)
- `src/common/interceptors/logging.interceptor.ts` (new)
- `package.json` (add nestjs-pino, pino-http)

**Implementation Steps**:
1. Install dependencies:
   ```bash
   yarn add nestjs-pino pino-http pino-pretty
   ```

2. Configure Pino in main.ts:
   ```typescript
   import { Logger } from 'nestjs-pino';
   
   app.useLogger(app.get(Logger));
   ```

3. Add LoggerModule to AppModule:
   ```typescript
   LoggerModule.forRoot({
     pinoHttp: {
       transport: process.env.NODE_ENV !== 'production'
         ? { target: 'pino-pretty' }
         : undefined,
       customProps: (req) => ({
         tenantId: req.user?.tenantId,
         userId: req.user?.id,
       }),
     },
   })
   ```

4. Add correlation ID interceptor:
   ```typescript
   export class LoggingInterceptor implements NestInterceptor {
     intercept(context, next) {
       const req = context.switchToHttp().getRequest();
       req.id = req.headers['x-request-id'] || uuid();
       return next.handle();
     }
   }
   ```

**Testing**:
- Make API request, verify log is valid JSON
- Verify tenantId, userId in logs
- Verify correlation ID propagates

**Acceptance Criteria**:
- ✅ All logs output as JSON
- ✅ Correlation IDs present
- ✅ Production logs exclude debug level

---

## Phase 6: Documentation & Final Review

**Goal**: Update all documentation, final constitution check

### 6.1 Documentation Updates

**Files Modified**:
- `README.md`
- `INTEGRATION_GUIDE.md`
- `PRODUCTION_READINESS.md`
- `.specify/memory/constitution.md` (update implementation status)

**Updates**:
1. README: Add environment variable setup section
2. INTEGRATION_GUIDE: Reference `.env.example`
3. PRODUCTION_READINESS: Check off completed items
4. Constitution: Update status from ❌ to ✅ for resolved violations

---

### 6.2 Final Constitution Check

**Re-run Checklist**:
- [x] Multi-Tenancy First: Audit has tenantId ✅
- [x] Security-First: Rate limiting active ✅
- [x] Security-First: Secrets externalized ✅
- [x] Testing & Quality Gates: >60% coverage ✅
- [x] Audit Trail: Structured logging ✅

**Sign-off Required**:
- [ ] Security team review
- [ ] DevOps team (env vars, deployment)
- [ ] Product team (acceptance testing)

---

## Rollout Strategy

### Stage 1: Development Environment
1. Apply migrations to dev database
2. Deploy with new env vars
3. Run full test suite
4. Verify rate limiting doesn't block normal usage

### Stage 2: Staging Environment
1. Backup staging database
2. Apply migrations
3. Load test rate limiting (k6 script)
4. Verify structured logs in log aggregator
5. Run smoke tests

### Stage 3: Production (Blue-Green Deployment)
1. Deploy to green environment with new code
2. Run database migration (zero downtime)
3. Smoke test green environment
4. Switch traffic to green
5. Monitor for 24 hours
6. Decommission blue if stable

### Rollback Plan
- Database: Revert migration (add DROP COLUMN)
- Code: Revert git commit
- Config: Keep old env vars for 7 days

---

## Timeline Estimate

| Phase | Duration | Dependencies | Parallelizable |
|-------|----------|--------------|----------------|
| Phase 0: Research | 4-6 hours | None | Yes (with Phase 1) |
| Phase 1: Security Fixes | 8-12 hours | Phase 0 decisions | No (sequential) |
| Phase 2: Test Setup | 2-4 hours | Phase 1 complete | Yes (with Phase 3) |
| Phase 3: Unit Tests | 16-24 hours | Phase 2 setup | Yes (distributed) |
| Phase 4: E2E Tests | 8-12 hours | Phase 3 patterns | No (needs Phase 3) |
| Phase 5: Logging | 4-6 hours | None | Yes (with 3-4) |
| Phase 6: Docs/Review | 4-6 hours | All phases done | No |

**Total Estimated Time**: 46-70 hours (1-2 weeks with 1 developer, 3-5 days with 2 developers)

**Critical Path**: Phase 0 → Phase 1 → Phase 3 → Phase 4 → Phase 6  
**Parallel Tracks**: Phase 2, 5 can run alongside Phase 3-4

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Audit migration fails on prod | Low | High | Test on staging with production data snapshot |
| Rate limiting too restrictive | Medium | Medium | Start with high limits, monitor, tune down |
| Test writing takes longer | High | Low | Prioritize critical services first (Phase 3.1) |
| Pino breaks existing logs | Low | Medium | Feature flag Pino, fall back to default logger |
| Coverage thresholds block CI | Medium | Low | Set thresholds to current + 10%, not absolute 60% |

---

## Success Metrics

**Must Have**:
- ✅ Zero constitutional violations remaining
- ✅ Test coverage >60% overall, >80% critical services
- ✅ All secrets in environment variables
- ✅ Rate limiting active and tested

**Should Have**:
- ✅ Load test passes (1000 req/min sustained)
- ✅ Migration tested on production-sized dataset
- ✅ Structured logs working in staging

**Nice to Have**:
- CI/CD pipeline with coverage reporting
- Grafana dashboard for rate limit metrics
- Automated security scanning (Snyk, npm audit)

---

## Next Steps

1. Review this plan with team
2. Create tasks.md using `/speckit.tasks` command
3. Assign Phase 1 tasks (blocking items)
4. Set up feature flag for Pino (if needed)
5. Schedule staging deployment date
6. Book security team review
