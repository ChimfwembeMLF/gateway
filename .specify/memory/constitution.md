# Payment Gateway Constitution

This document defines the non-negotiable architectural principles, security requirements, and quality standards for the Payment Gateway project. All features, changes, and integrations MUST comply with these principles.

---

## Core Principles

### I. Multi-Tenancy First (NON-NEGOTIABLE)

**Every feature MUST enforce tenant isolation:**
- All database entities MUST include a `tenantId` field indexed for query performance
- All database queries MUST filter by `tenantId` to prevent cross-tenant data leakage
- API keys MUST be scoped to a single tenant (enforced by ApiKeyGuard)
- Users, payments, transactions, provider tokens, and audit logs MUST be isolated per tenant
- All endpoints MUST require and validate the `x-tenant-id` header (name or UUID) via ApiKeyGuard
- Tenant resolution MUST support both UUID and human-readable tenant names (case-insensitive)
- No global admin access that bypasses tenant boundaries (except SUPER_ADMIN role for tenant management)

**Current Implementation Status:**
- ✅ User, Payment, Transaction, ProviderToken entities have `tenantId` with indexes
- ✅ ApiKeyGuard enforces tenant header and validates tenant existence
- ✅ All service methods filter queries by `tenantId`
- ❌ **CRITICAL GAP:** Audit entity missing `tenantId` field - must be added immediately

**Rationale:** Multi-tenancy is the foundation of the gateway's business model. Breaking tenant isolation is a critical security vulnerability that could expose client data and violate compliance requirements.

### II. Security-First Architecture

**Security MUST be enforced at every layer:**
- All endpoints (except `/auth/register` and `/auth/login`) MUST require API key authentication via `Authorization: Bearer <token>` or `x-api-key` header
- ApiKeyGuard MUST validate both API key AND tenant association before granting access
- Secrets (JWT keys, database passwords, MTN API keys) MUST NEVER be committed to source control
- All secrets MUST be loaded from environment variables with validation on startup
- Input validation MUST use `class-validator` DTOs with `whitelist`, `forbidNonWhitelisted`, and `transform` options (enforced in main.ts)
- Rate limiting MUST be enabled globally using `@nestjs/throttler` 
- CORS MUST be configured with explicit allowed origins from `ALLOWED_ORIGINS` env var (no wildcard `*` in production)
- Helmet middleware MUST be enabled for HTTP security headers
- Database migrations MUST be used; `synchronize: true` is FORBIDDEN in production
- Global exception filter MUST sanitize error responses to avoid information leakage

**Current Implementation Status:**
- ✅ ApiKeyGuard implemented with tenant validation
- ✅ ValidationPipe configured globally with security options
- ✅ Helmet enabled in main.ts
- ✅ CORS configured with environment-based origins
- ✅ AllExceptionsFilter implemented
- ❌ **TODO:** Rate limiting installed but not activated - must configure ThrottlerModule in AppModule
- ⚠️ **WARNING:** Config files contain hardcoded MTN sandbox keys - must externalize before production

**Rationale:** The gateway handles financial transactions and sensitive customer data. Any security breach could result in financial loss, regulatory penalties, and irreparable reputation damage.

### III. Provider-Agnostic Payment Abstraction

**All payment providers MUST use a unified interface:**
- Single endpoint `/api/v1/payments` for all payment operations across providers
- Provider selection via `provider` field in request body (e.g., `"mtn"`, `"airtel"`, `"zamtel"`)
- Consistent request/response DTOs across all providers (normalize provider-specific formats internally)
- Provider-specific services MUST implement a common payment interface/contract
- Idempotency MUST be enforced using `externalId` to prevent duplicate charges
- Failed payments MUST be retryable with exponential backoff and clear error categorization

**Rationale:** Clients should not be locked into a single provider. The gateway's value proposition is abstraction and simplicity across multiple payment systems.

### IV. Audit Trail & Observability (NON-NEGOTIABLE)

**Every state change MUST be auditable:**
- All payment state transitions (pending → completed/failed) MUST be logged with timestamp, user, tenant, and reason
- Audit logs MUST capture: `userId`, `tenantId`, `event`, `auditableType`, `auditableId`, `oldValues`, `newValues`, `ipAddress`, `userAgent`, `url`
- Audit logs MUST be immutable (append-only) and retained per compliance requirements
- Entity changes MUST use TypeORM subscribers to auto-generate audit records
- Structured logging (JSON format) MUST be used for all application logs (no console.log in production)
- All external API calls (MTN, Airtel, etc.) MUST log request/response bodies (sanitized) for debugging

**Current Implementation Status:**
- ✅ AuditSubscriber implemented for afterInsert, afterUpdate, afterRemove events
- ✅ Audit entity stores: event, auditableType, auditableId, oldValues (jsonb), newValues (jsonb)
- ❌ **CRITICAL:** Audit entity missing `tenantId` field - audit logs are NOT tenant-isolated
- ⚠️ Audit context middleware exists but not fully integrated with subscriber
- ⚠️ Application still uses console.log/Logger - not structured JSON format

**Immediate Action Required:**
- Add `@Column() tenantId: string;` and `@Index(['tenantId'])` to Audit entity
- Update AuditSubscriber to extract tenantId from entity being audited
- Configure structured logging (Pino or Winston) with JSON output

**Observability requirements:**
- Health/readiness endpoints MUST be exposed for orchestration (Kubernetes, Docker Compose)
- Metrics MUST track: request counts, error rates, payment success/failure rates, provider latency
- Request context (correlation IDs) MUST propagate through all logs for traceability

**Rationale:** Financial systems require complete auditability for compliance, fraud detection, dispute resolution, and debugging. Missing audit trails can result in regulatory violations and inability to resolve customer issues.

### V. Testing & Quality Gates

**Code quality MUST be verified before deployment:**
- Unit tests MUST cover: authentication logic, API key guards, payment service logic, tenant isolation, DTO validation
- Integration tests MUST cover: end-to-end payment flows (happy path + error cases), webhook processing, tenant data isolation
- E2E tests MUST verify: `/auth/register`, `/auth/login`, `/api/v1/payments` (MTN), multi-tenant scenarios
- Contract tests MUST validate: webhook payload handling, provider API request/response formats
- Test coverage MUST be measured and tracked (target: >80% coverage on critical paths, minimum: >60% overall)
- All tests MUST pass before merging to main branch
- CI/CD pipeline MUST run linting, type checking, tests, and build verification on every commit

**Current Implementation Status:**
- ⚠️ **CRITICAL GAP:** Test coverage is minimal (~5-10% estimated)
- ✅ Basic unit test structure exists: api-key.guard.spec.ts, users.service.spec.ts, auth.service.spec.ts
- ❌ Missing integration tests for payment flows
- ❌ Missing E2E tests for multi-tenant isolation
- ❌ Missing contract tests for MTN MoMo API
- ❌ Missing test coverage reporting configuration
- ❌ No CI/CD pipeline configured

**Immediate Action Required:**
- Add integration tests for MTN Collection requestToPay flow (success, failure, timeout)
- Add E2E tests for tenant isolation (verify user A cannot access tenant B's data)
- Configure Jest coverage thresholds in package.json
- Set up GitHub Actions or similar CI/CD pipeline

**Rationale:** Payment systems handle real money. Bugs can result in financial loss, regulatory issues, and customer distrust. Comprehensive testing is mandatory.

---

## Technical Constraints

### Stack Requirements
- **Framework:** NestJS (TypeScript) with modular architecture
- **Database:** PostgreSQL with TypeORM (migrations mandatory, no schema sync in production)
- **Authentication:** API key-based (JWT for internal use only, not for external integration)
- **API Documentation:** Swagger/OpenAPI accessible at `/documentation`
- **Configuration:** Environment-based with `@nestjs/config` and validation via `class-validator`
- **Containerization:** Docker with multi-stage builds; non-root user; health checks enabled

### Provider Integration Standards
- **MTN MoMo:** Collection (requestToPay), Disbursement, Balance check; sandbox and production environments
- **Future Providers:** Airtel Money, Zamtel (must reuse unified payment interface)
- **Webhook Support:** Optional callback URL for async payment status updates (idempotent handling required)

### Data Retention & Cleanup
- Completed payments MUST be retained for minimum 7 years (compliance)
- Failed/abandoned payments older than 90 days MAY be archived or deleted
- Audit logs MUST be retained per regulatory requirements (default: indefinite)
- Automated cleanup jobs MUST run on schedule (use `@nestjs/schedule` cron jobs)

---

## Development Workflow

### Feature Development Process
1. **Specification:** All new features MUST start with a written spec defining requirements, edge cases, and acceptance criteria
2. **Planning:** Implementation plan MUST include architecture decisions, data model changes, API contract changes
3. **Task Breakdown:** Complex features MUST be decomposed into granular, testable tasks
4. **Implementation:** Code changes MUST include corresponding tests and updated documentation
5. **Review:** All changes MUST be peer-reviewed for security, correctness, and constitution compliance
6. **Deployment:** Changes MUST pass CI/CD pipeline (lint, test, build) before deployment

### Review Checklist
Every code change MUST verify:
- ✅ Tenant isolation enforced (no queries without `tenantId` filter)
- ✅ API key authentication applied (except public endpoints)
- ✅ Input validation using DTOs with `class-validator`
- ✅ Secrets externalized (no hardcoded credentials)
- ✅ Audit logs generated for state changes
- ✅ Tests written (unit + integration where applicable)
- ✅ Error handling with proper HTTP status codes and error messages
- ✅ Documentation updated (API docs, README, integration guide)

### Pre-Production Checklist
Before allowing third-party integrations:
- ✅ All secrets moved to environment variables with validation
- ✅ Database migrations created and tested
- ✅ API key generation/rotation endpoints implemented
- ✅ Tenant management endpoints functional
- ✅ Rate limiting configured
- ✅ CORS and Helmet enabled with production settings
- ✅ Structured logging configured (no console.log)
- ✅ Health endpoints exposed
- ✅ Integration guide updated with examples
- ✅ E2E tests passing in staging environment

---

## Governance

### Constitution Authority
- This constitution supersedes all other development practices, coding standards, and ad-hoc decisions
- All feature specifications, implementation plans, and code reviews MUST verify compliance with these principles
- Violations of NON-NEGOTIABLE principles MUST be rejected immediately

### Amendment Process
- Amendments require: written proposal with rationale, team review, approval, and migration plan for affected code
- Version updates follow semantic versioning:
  - **MAJOR:** Breaking changes to principles (e.g., removing a core principle)
  - **MINOR:** New principle added or significant expansion of existing principle
  - **PATCH:** Clarifications, typo fixes, non-semantic refinements

### Enforcement
- All PRs MUST include a self-certification that the changes comply with this constitution
- Code reviewers MUST verify constitution compliance as part of the review process
- Automated linting and testing MUST enforce technical constraints where possible (e.g., prevent `synchronize: true` in production configs)

### Runtime Development Guidance
- Use `.specify/templates/` for feature specs, plans, and task breakdowns
- Follow the Spec-Driven Development workflow: specify → plan → tasks → implement → verify
- Refer to `PRODUCTION_READINESS.md` for deployment requirements
- Refer to `INTEGRATION_GUIDE.md` for API usage patterns

---

**Version**: 1.0.0  
**Ratified**: February 4, 2026  
**Last Amended**: February 4, 2026
