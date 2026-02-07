# Feature Specification: Production Readiness - Critical Security & Compliance Fixes

**Feature Branch**: `002-security-fixes`  
**Created**: February 4, 2026  
**Status**: Draft  
**Priority**: P0 (Critical - Blocks Production Deployment)

## Overview

This specification addresses critical security vulnerabilities and compliance gaps identified in the Payment Gateway constitution review. These issues MUST be resolved before allowing third-party integrations or production deployment.

**Constitutional Violations:**
- ❌ **Multi-Tenancy First**: Audit entity missing `tenantId` field (tenant data leakage risk)
- ❌ **Security-First**: Rate limiting not activated (DoS vulnerability)
- ❌ **Security-First**: Hardcoded credentials in config files
- ❌ **Testing & Quality Gates**: <10% test coverage vs. 80% target

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tenant-Isolated Audit Logs (Priority: P0 - CRITICAL)

**As a** Tenant Administrator  
**I need** all audit logs to be isolated per tenant  
**So that** I can only see audit events for my tenant's data and comply with data privacy regulations

**Why this priority**: Current implementation allows cross-tenant audit log access, violating GDPR/SOC2 requirements and the Multi-Tenancy First principle. This is a **blocking security vulnerability**.

**Independent Test**: Create users in Tenant A and Tenant B, perform actions in both, verify Tenant A admin can only query audit logs with their tenantId filter.

**Acceptance Scenarios**:

1. **Given** Audit entity has `tenantId` field indexed  
   **When** any entity is created/updated/deleted  
   **Then** the audit record MUST include the entity's `tenantId`

2. **Given** I am authenticated as Tenant A user  
   **When** I query `/api/v1/audits`  
   **Then** I MUST only see audit logs where `tenantId = A`

3. **Given** Tenant A creates a payment, Tenant B creates a payment  
   **When** Tenant A queries audit logs  
   **Then** they MUST NOT see Tenant B's payment creation audit log

4. **Given** AuditSubscriber triggers on entity change  
   **When** entity does not have `tenantId` (e.g., Tenant entity itself)  
   **Then** audit record uses system/admin tenantId or marks as global

---

### User Story 2 - Rate Limiting Protection (Priority: P0 - CRITICAL)

**As a** Platform Operator  
**I need** rate limiting enabled on all API endpoints  
**So that** the gateway is protected from DoS attacks and abusive clients

**Why this priority**: Payment gateway is a critical financial system. Without rate limiting, a single malicious client could overwhelm the service, causing downtime for all tenants.

**Independent Test**: Configure ThrottlerModule, make 100 requests/second to `/api/v1/payments`, verify requests are throttled after limit exceeded.

**Acceptance Scenarios**:

1. **Given** ThrottlerModule is configured with `ttl: 60` and `limit: 100`  
   **When** a client makes 101 requests within 60 seconds  
   **Then** the 101st request MUST return `429 Too Many Requests`

2. **Given** rate limit is tenant-scoped  
   **When** Tenant A exceeds their limit  
   **Then** Tenant B's requests MUST still be processed normally

3. **Given** public endpoints (`/auth/register`, `/auth/login`)  
   **When** rate limit is exceeded  
   **Then** rate limit MUST still apply (prevent registration spam)

4. **Given** health check endpoint (`/health`)  
   **When** orchestrator polls frequently  
   **Then** health endpoint MUST be excluded from rate limiting

---

### User Story 3 - Externalized Secrets (Priority: P0 - CRITICAL)

**As a** DevOps Engineer  
**I need** all secrets loaded from environment variables  
**So that** credentials are never committed to source control and can be rotated per environment

**Why this priority**: `config/default.yaml` contains hardcoded MTN sandbox keys. If this repository is compromised or accidentally made public, credentials are exposed.

**Independent Test**: Remove all credentials from config files, start app with only env vars, verify MTN API calls succeed.

**Acceptance Scenarios**:

1. **Given** all secrets removed from `config/*.yaml`  
   **When** I start the application without environment variables  
   **Then** app MUST fail to start with clear error message listing missing vars

2. **Given** I set `MTN_COLLECTION_SUBSCRIPTION_KEY` environment variable  
   **When** app loads configuration  
   **Then** it MUST use the env var value, not any hardcoded default

3. **Given** `.env.example` file exists  
   **When** new developer clones repository  
   **Then** they can copy `.env.example` to `.env` and fill in credentials

4. **Given** production deployment  
   **When** secrets are rotated  
   **Then** app can be restarted with new env vars without code changes

---

### User Story 4 - Comprehensive Test Coverage (Priority: P1 - HIGH)

**As a** Developer  
**I need** comprehensive test coverage for critical payment paths  
**So that** I can deploy changes confidently without breaking production

**Why this priority**: Current <10% coverage means code changes are essentially untested. Payment bugs cause financial loss and customer distrust.

**Independent Test**: Run `yarn test:cov`, verify coverage >60% overall, >80% on critical services (PaymentsService, ApiKeyGuard, TenantService).

**Acceptance Scenarios**:

1. **Given** MTN requestToPay happy path test  
   **When** test runs with mocked MTN API  
   **Then** payment entity is created with status PENDING and momoTransactionId

2. **Given** Tenant isolation test  
   **When** Tenant A user queries `/api/v1/payments` with Tenant B's ID  
   **Then** request MUST be rejected with 404 or 403

3. **Given** ApiKeyGuard unit test  
   **When** request has valid API key but mismatched tenantId  
   **Then** guard MUST reject with UnauthorizedException

4. **Given** E2E test for complete payment flow  
   **When** user registers → gets API key → creates payment → checks status  
   **Then** all steps succeed and payment status is correctly tracked

---

### User Story 5 - Structured Logging (Priority: P2 - MEDIUM)

**As a** DevOps Engineer  
**I need** structured JSON logs with correlation IDs  
**So that** I can trace requests across services and debug production issues efficiently

**Why this priority**: Current `console.log` statements make production debugging difficult. Structured logs enable log aggregation (ELK, Splunk) and correlation.

**Independent Test**: Make API request, verify log output is valid JSON with `requestId`, `tenantId`, `userId`, `timestamp`, `level`, `message`.

**Acceptance Scenarios**:

1. **Given** Pino or Winston configured  
   **When** any log statement executes  
   **Then** output MUST be valid JSON with required fields

2. **Given** incoming request with `X-Request-ID` header  
   **When** request is processed  
   **Then** all logs MUST include the same `requestId` for correlation

3. **Given** payment creation request  
   **When** error occurs in MTN API call  
   **Then** log MUST include: tenantId, userId, paymentId, provider, error details

4. **Given** production environment  
   **When** log level is set to `info`  
   **Then** debug logs MUST be suppressed (performance)

---

## Non-Functional Requirements

### Security
- All database queries MUST filter by `tenantId` (already enforced, verify with tests)
- API key validation MUST complete in <50ms (performance)
- Rate limiting MUST not introduce >10ms latency overhead
- Secrets MUST be loaded from environment with validation on startup

### Performance
- Audit log writes MUST be asynchronous (non-blocking)
- Rate limit checks MUST use in-memory cache (Redis optional)
- Test suite MUST complete in <2 minutes

### Compliance
- Audit logs MUST be immutable (append-only)
- Audit logs MUST be retained per constitutional requirements
- PII in logs MUST be sanitized (mask phone numbers, API keys)

### Observability
- All critical paths MUST have error logging
- Metrics MUST track: rate limit hits, audit log volume, test coverage %

---

## Edge Cases & Error Handling

### Audit Logging
1. **Entity without tenantId**: System entities (Tenant, etc.) - use special `SYSTEM` tenantId or skip audit
2. **Audit write failure**: Log error but DO NOT block main transaction (audit is supplementary)
3. **High volume**: Implement batch writing if >1000 audits/second

### Rate Limiting
1. **Distributed deployment**: Use Redis for shared rate limit state across instances
2. **Burst traffic**: Allow short bursts above limit before throttling (token bucket algorithm)
3. **Admin override**: Super-admins may need rate limit exemption for bulk operations

### Secrets Management
1. **Missing env var**: Fail fast on startup with clear error message
2. **Invalid credentials**: Detect and log at startup, fail if critical (DB, MTN)
3. **Credential rotation**: Support hot-reload without restart (future enhancement)

### Testing
1. **Flaky tests**: Implement retry logic for external API mocks
2. **Test data cleanup**: Ensure tests don't leak data between runs (use transactions)
3. **Parallel execution**: Tests MUST be isolated (no shared state)

---

## Out of Scope (Future)

- CI/CD pipeline setup (GitHub Actions/GitLab CI) - separate task
- Database migration system setup - separate task
- Webhook idempotency testing - covered in separate webhook feature
- Advanced rate limiting (per-tenant custom limits) - future enhancement
- Log aggregation setup (ELK/Splunk) - infrastructure task
- Security audit/penetration testing - post-implementation

---

## Success Criteria

**Must Have (Blocking Production)**:
- ✅ Audit entity has `tenantId` field and all queries filter by tenant
- ✅ Rate limiting enabled with reasonable defaults (100 req/min per tenant)
- ✅ Zero hardcoded secrets in config files
- ✅ Test coverage >60% overall, >80% on critical services
- ✅ All constitution violations resolved

**Should Have**:
- ✅ Structured logging (JSON) with correlation IDs
- ✅ E2E tests for multi-tenant isolation
- ✅ Performance tests for rate limiting overhead

**Nice to Have**:
- CI/CD pipeline badges in README
- Test coverage trending dashboard
- Automated security scanning

---

## Dependencies & Risks

**Dependencies**:
- TypeORM migration tools (for Audit entity schema change)
- @nestjs/throttler package (already installed)
- Pino or Winston for structured logging
- Jest configuration for coverage thresholds

**Risks**:
- **High**: Schema migration for Audit table may fail if existing data has no tenantId (mitigation: backfill script)
- **Medium**: Rate limiting may need tuning based on production traffic patterns
- **Low**: Test writing time may exceed estimate (mitigate with parallel development)

**Blocking Issues**:
- None - all dependencies are available and well-documented

---

## Acceptance Checklist

Before merging to main:
- [ ] Audit entity migration tested on staging database
- [ ] Rate limiting tested with load testing tool (k6, Artillery)
- [ ] `.env.example` created with all required variables
- [ ] Test coverage report shows >60% overall
- [ ] All critical services have >80% coverage
- [ ] Structured logging verified in staging environment
- [ ] No secrets found in `config/*.yaml` files
- [ ] Constitution compliance review passes
- [ ] Security team sign-off obtained
- [ ] Documentation updated (README, INTEGRATION_GUIDE)
