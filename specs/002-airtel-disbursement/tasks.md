# Implementation Tasks: Airtel Money Disbursements

**Feature**: 002-airtel-disbursement  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)  
**Date**: February 6, 2026  
**Status**: Ready for development

---

## Executive Summary

Implement Airtel Money disbursement (payout) functionality following the specification and implementation plan. Feature delivers in phases matching user story priority:
- **Phase 1 (Setup)**: Database and module structure
- **Phase 2 (Foundational)**: Airtel disbursement service with OAuth/signing
- **Phase 3-6 (User Stories)**: P1→P4 features in priority order
- **Phase 7 (Polish)**: Testing and cross-cutting concerns

**Total Tasks**: 51  
**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (US1 - Core disbursement capability)

---

## Phase 1: Setup & Infrastructure

**Goal**: Initialize project structure, database, and configuration for disbursement feature.

**Independent Test Criteria**: N/A (foundational phase - tested by subsequent phases)

### T001-T008: Database & Configuration

- [x] T001 Create `DisbursementStatus` enum in `src/common/enums/disbursement-status.enum.ts`
- [x] T002 Create `WalletType` enum in `src/common/enums/wallet-type.enum.ts`
- [x] T003 Create `TransactionType` enum in `src/common/enums/transaction-type.enum.ts`
- [x] T004 Create `Disbursement` entity in `src/modules/disbursements/entities/disbursement.entity.ts` with tenantId, idempotency indexes, and all fields per data-model.md
- [x] T005 Create database migration file `src/migrations/TIMESTAMP-create-disbursements-table.ts` with all indexes and constraints
- [x] T006 Add Disbursement entity to TypeORM configuration in `src/config/database.config.ts`
- [X] T007 Create migration runner script `.specify/migrations/run-disbursement-migration.sh`
- [X] T008 Update `config/{default,development,staging,production}.yaml` with disbursement-specific settings (if any beyond Airtel config)

### T009-T015: Module Structure

- [x] T009 Create `src/modules/disbursements/disbursements.module.ts` with DisbursementsService, DisbursementsController, DisbursementRepository
- [x] T010 Create `src/modules/disbursements/dto/create-disbursement.dto.ts` with validation rules (MSISDN format, positive amount, valid enums)
- [x] T011 Create `src/modules/disbursements/dto/disbursement-response.dto.ts` for API responses
- [x] T012 Create `src/modules/disbursements/dto/list-disbursements-query.dto.ts` with pagination and filtering
- [x] T013 Update `src/modules/airtel/dto/airtel-disbursement.dto.ts` for Airtel API request/response mapping
- [x] T014 Update `src/app.module.ts` to import `DisbursementsModule` and `AirtelModule`
- [x] T015 Create `src/modules/disbursements/repositories/disbursement.repository.ts` with custom queries (findByExternalId, findByTenant, etc.)

---

## Phase 2: Foundational Infrastructure

**Goal**: Implement Airtel disbursement API service with authentication and signing (reusing existing OAuth2/signing infrastructure).

**Independent Test Criteria**: N/A (foundational - tested by Phase 3)

**Dependency**: Phase 1 complete

### T016-T025: Airtel Disbursement Service

- [x] T016 Create `src/modules/airtel/disbursement/airtel-disbursement.service.ts` with `createDisbursement()` method that:
  - Validates MSISDN (strip country code prefix if needed)
  - Encrypts PIN using AirtelSigningService
  - Calls AirtelAuthService for OAuth2 token
  - Calls AirtelSigningService for x-signature and x-key headers
  - Posts to `/standard/v3/disbursements` endpoint
  - Maps Airtel response to internal format
  - Handles errors gracefully with specific error codes
  
- [x] T017 Add `queryDisbursementStatus(transactionId)` method to AirtelDisbursementService for polling status updates

- [x] T018 Add `refundDisbursement(refundDto)` method to AirtelDisbursementService for future refund support

- [x] T019 Update `src/modules/airtel/airtel.module.ts` to export `AirtelDisbursementService`

- [x] T020 [P] Create `src/modules/airtel/disbursement/airtel-disbursement.service.spec.ts` with:
  - Test successful disbursement creation
  - Test MSISDN validation (reject country code)
  - Test API error handling
  - Test idempotency (duplicate transaction ID)
  
- [ ] T021 [P] Create `src/modules/airtel/disbursement/airtel-disbursement.service.integration.spec.ts` with:
  - Test Airtel OAuth2 integration
  - Test message signing (x-signature, x-key)
  - Test actual Airtel API call (sandbox)
  
- [ ] T022 [P] Update `src/modules/airtel/auth/airtel-auth.service.spec.ts` if needed for disbursement flow

- [x] T023 Implement PIN encryption helper in `src/modules/airtel/signing/airtel-signing.service.ts`:
  - Add `encryptPin(pin: string): string` method using RSA-OAEP
  
- [x] T024 [P] Create `src/modules/airtel/signing/airtel-signing.service.spec.ts` for PIN encryption tests

- [X] T025 Update configuration to add PIN encryption key if different from x-key

---

## Phase 3: User Story 1 - Core Disbursement

**Goal**: Implement core disbursement capability enabling businesses to send money to customer wallets.

**User Story**: US1 - Business Sends Payment to Customer Wallet (P1)

**Independent Test**: POST /api/v1/disbursements endpoint with valid request returns transaction, status updates correctly

**Dependency**: Phase 1, Phase 2 complete

### T026-T035: Business Logic & Service Layer

- [x] T026 [US1] Create `src/modules/disbursements/disbursements.service.ts` with:
  - `createDisbursement(dto, tenantId)` method that:
    - Validates input (MSISDN, amount, PIN format)
    - Checks for idempotency (existing externalId)
    - Creates Disbursement record with PENDING status
    - Calls AirtelDisbursementService
    - Updates status to SUCCESS or FAILED
    - Returns disbursement with transaction ID
    
- [x] T027 [US1] Add MSISDN normalization helper (strip +260 prefix, validate format)

- [x] T028 [US1] Implement tenant isolation checks in DisbursementsService (all queries filter by tenantId)

- [x] T029 [US1] Add error mapping from Airtel error codes to user-friendly messages

- [x] T030 [US1] Integrate AuditSubscriber for automatic audit logging of Disbursement entity changes

- [x] T031 [P] [US1] Create `src/modules/disbursements/disbursements.service.spec.ts` with:
  - Test successful disbursement creation
  - Test MSISDN validation
  - Test idempotency (duplicate externalId)
  - Test tenant isolation
  - Test error handling
  - Test audit logging
  
- [ ] T032 [P] [US1] Create `src/modules/disbursements/disbursements.service.integration.spec.ts` with:
  - Test full flow with AirtelDisbursementService mock
  - Test database persistence
  - Test status transitions (PENDING → SUCCESS)
  
- [X] T033 [US1] Implement rate limiting configuration for `/api/v1/disbursements` endpoint

- [ ] T034 [US1] Add metrics/observability for disbursement operations (request count, success rate, latency)

- [ ] T035 [US1] Create `DISBURSEMENT_SETUP.md` documenting environment variables and manual testing

### T036-T042: REST API Layer

- [x] T036 [US1] Create `src/modules/disbursements/disbursements.controller.ts` with:
  - `POST /api/v1/disbursements` endpoint
    - Required: ApiKeyGuard for authentication
    - Required: ValidationPipe for input validation
    - Request body: CreateDisbursementDto
    - Response: DisbursementResponseDto
    - Error responses: 400, 401, 429, 500
  
- [x] T037 [US1] [P] Create `src/modules/disbursements/disbursements.controller.spec.ts` with:
  - Test POST endpoint with valid request
  - Test request validation (invalid MSISDN, amount)
  - Test API key validation
  - Test response format matches OpenAPI spec
  
- [ ] T038 [US1] Create POST /api/v1/disbursements integration test

- [ ] T039 [US1] Update Swagger/OpenAPI documentation to include POST /api/v1/disbursements endpoint

- [ ] T040 [US1] Implement request/response logging for debugging (sanitize PIN)

- [ ] T041 [US1] Add request correlation ID propagation through logs

- [ ] T042 [US1] Create integration test for full US1 flow: POST → status check → verify Airtel called correctly

---

## Phase 4: User Story 2 - Status Tracking

**Goal**: Enable businesses to track disbursement status and view history.

**User Story**: US2 - Track Disbursement Status and History (P2)

**Independent Test**: GET /api/v1/disbursements/{id} and GET /api/v1/disbursements endpoints return correct data

**Dependency**: Phase 1, Phase 2, Phase 3 complete

### T043-T051: Query & Listing Endpoints

- [ ] T043 [US2] Implement `getDisbursement(id, tenantId)` in DisbursementsService:
  - Find by ID with tenant isolation
  - If PENDING, optionally call AirtelDisbursementService to update status
  - Return current state

- [ ] T044 [US2] Implement `listDisbursements(tenantId, filters, pagination)` in DisbursementsService:
  - Filter by status, date range
  - Support pagination (page, limit)
  - Order by createdAt DESC

- [ ] T045 [US2] Create `GET /api/v1/disbursements/{id}` endpoint in controller with:
  - ApiKeyGuard, tenant isolation check
  - Response: DisbursementResponseDto with all fields

- [ ] T046 [US2] Create `GET /api/v1/disbursements` endpoint in controller with:
  - ApiKeyGuard, pagination, filtering
  - Response: Paginated list of DisbursementResponseDto

- [ ] T047 [P] [US2] Create tests for GET endpoints:
  - Test retrieving existing disbursement
  - Test 404 for non-existent disbursement
  - Test tenant isolation (can't access other tenant's disbursement)
  - Test list filtering by status
  - Test list pagination

- [ ] T048 [US2] Update Swagger/OpenAPI for GET endpoints

- [ ] T049 [US2] Implement status polling optimization (cache TTL for PENDING disbursements)

- [ ] T050 [US2] Add tests for multi-tenant isolation on list endpoint

- [ ] T051 [US2] Create E2E test for US2 user journey

---

## Phase 5: User Story 3 - Failure Handling

**Goal**: Implement error handling, logging, and retry support for failed disbursements.

**User Story**: US3 - Handle Disbursement Failures and Retries (P3)

**Independent Test**: Failed disbursements record error code/message, idempotent retry works correctly

**Dependency**: Phase 1-4 complete

### Tasks T052-T060 (6-8 tasks)

- [ ] T052 [US3] Implement error code mapping:
  - Create `src/modules/disbursements/constants/airtel-error-codes.ts`
  - Map Airtel error codes to user-friendly messages
  - Distinguish retry-able vs permanent failures

- [ ] T053 [US3] Implement retry logic:
  - Add `retryable` field to Disbursement entity if needed
  - Implement check in createDisbursement to retry failed disbursement if retryable
  - Limit retry attempts

- [ ] T054 [US3] Add detailed error logging:
  - Log Airtel API responses (sanitized)
  - Log stack traces for debugging
  - Include transaction ID in all error logs

- [ ] T055 [US3] Implement timeout handling:
  - Set appropriate timeouts on Airtel API calls
  - Mark timed-out disbursements as PENDING (not FAILED)
  - Document polling behavior

- [ ] T056 [P] [US3] Create comprehensive error handling tests:
  - Test various Airtel error codes
  - Test timeout scenarios
  - Test retry logic

- [ ] T057 [US3] Update API error responses to include errorCode and errorMessage

- [ ] T058 [US3] Add structured error logging (JSON format)

- [ ] T059 [US3] Create troubleshooting guide documenting common errors and solutions

- [ ] T060 [US3] Create E2E test for US3 failure scenarios

---

## Phase 6: User Story 4 - Wallet & Transaction Types

**Goal**: Support different wallet types and transaction classifications.

**User Story**: US4 - Support Different Wallet Types and Transaction Types (P3)

**Independent Test**: POST with wallet_type="SALARY" and transactionType="B2B" correctly routes to Airtel

**Dependency**: Phase 1-5 complete

### Tasks T061-T068 (6-8 tasks)

- [ ] T061 [US4] Add wallet type validation in CreateDisbursementDto:
  - Accept WalletType enum
  - Default to NORMAL if not specified
  - Validate against allowed values

- [ ] T062 [US4] Add transaction type validation in CreateDisbursementDto:
  - Accept TransactionType enum  
  - Default to B2C if not specified
  - Validate against allowed values

- [ ] T063 [US4] Update AirtelDisbursementService to include walletType and transactionType in API request

- [ ] T064 [US4] Create test data factory with various wallet/transaction type combinations

- [ ] T065 [P] [US4] Create tests for different wallet types:
  - Test NORMAL wallet type
  - Test SALARY wallet type
  - Test default to NORMAL if not specified
  - Test invalid wallet type rejection

- [ ] T066 [P] [US4] Create tests for different transaction types:
  - Test B2C transaction
  - Test B2B transaction
  - Test default to B2C if not specified

- [ ] T067 [US4] Update OpenAPI spec to include wallet type and transaction type examples

- [ ] T068 [US4] Create E2E test for US4 with different wallet/transaction type combinations

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Testing, documentation, and production readiness.

**Independent Test Criteria**: All unit/E2E tests pass, code coverage >80% on critical paths

**Dependency**: Phase 1-6 complete

### T069-T090: Testing & Quality

- [ ] T069 Run all unit tests: `npm test -- disbursements` with coverage report

- [ ] T070 Run all E2E tests: `npm run test:e2e -- disbursements.e2e-spec`

- [ ] T071 Ensure code coverage ≥80% for DisbursementsService, AirtelDisbursementService

- [ ] T072 Configure Jest coverage thresholds in `package.json` for disbursements module

- [ ] T073 [P] Create integration test for multi-tenant isolation:
  - Tenant A creates disbursement
  - Verify Tenant B cannot see it
  - Verify list endpoint only shows Tenant A's disbursements

- [ ] T074 [P] Create stress test for concurrent disbursement requests:
  - 100 concurrent requests from different tenants
  - Verify all succeed without errors
  - Check database consistency

- [ ] T075 Create smoke test for production environment

- [ ] T076 Add contract test validating Airtel API request/response format

- [ ] T077 Performance test: Verify POST /api/v1/disbursements < 5 seconds

- [ ] T078 Performance test: Verify GET endpoints < 200ms

- [ ] T079 Add test for idempotency: Same externalId returns exact same response

- [ ] T080 Add test for rate limiting enforcement

### T081-T090: Documentation & Production

- [ ] T081 Update `README.md` with disbursements feature overview

- [ ] T082 Create `docs/disbursements.md` with architecture diagram

- [ ] T083 Add environment variable documentation to `AIRTEL_SETUP.md` (reuse from collections)

- [ ] T084 Create runbook for operational tasks (manual refunds, status checks)

- [ ] T085 Add monitoring/alerting configuration examples

- [ ] T086 Create migration guide for data model changes

- [ ] T087 Add database backup/recovery procedures for disbursement data

- [ ] T088 Conduct security review (PIN encryption, tenant isolation, audit logging)

- [ ] T089 Create production deployment checklist

- [ ] T090 Final review: All tasks complete, all tests pass, documentation complete

---

## Task Dependencies & Parallelization

### Sequential Phases (Must Complete In Order)
```
Phase 1 (T001-T015) 
  → Phase 2 (T016-T025)
    → Phase 3 (T026-T042) [US1]
      → Phase 4 (T043-T051) [US2]
        → Phase 5 (T052-T060) [US3]
          → Phase 6 (T061-T068) [US4]
            → Phase 7 (T069-T090)
```

### Parallelization Within Phases

**Phase 1**: All tasks can run in parallel
- Database (T001-T008) in parallel
- Module structure (T009-T015) in parallel
- Cross-phase dependency: None

**Phase 2**: Mostly sequential
- AirtelDisbursementService (T016-T019) first
- Unit tests (T020, T022, T024) can run in parallel after service exists
- PIN encryption (T023-T025) can run in parallel

**Phase 3**: Can parallelize by concern
- Business logic (T026-T035) first
- REST controllers (T036-T042) once services exist
- Tests (T031, T037) can run after implementations

**Phase 7**: Testing phases mostly parallelizable
- Unit tests (T069, T072) parallel
- E2E tests (T070, T073, T074, T077-T078) parallel
- Documentation (T081-T087) parallel
- Reviews (T088-T090) sequential at end

---

## MVP (Minimum Viable Product) Scope

**Minimum viable feature**: Phases 1-3 (US1 only)

| Phase | Tasks | Effort | Value |
|-------|-------|--------|-------|
| 1 | T001-T015 | 2-3 days | Infrastructure + unblocks Phase 2 |
| 2 | T016-T025 | 2-3 days | Airtel integration + unblocks Phase 3 |
| 3 | T026-T042 | 3-4 days | Core disbursement feature (fully testable) |
| **MVP Total** | **51 tasks** | **7-10 days** | **Businesses can send money to wallets** |

---

## Success Metrics

| Metric | Target | Verification |
|--------|--------|--------------|
| Test Coverage | >80% | `npm test -- disbursements --coverage` |
| All Tests Passing | 100% | All Jest tests pass |
| Multi-Tenant Isolation | 100% | E2E test T050, T073 pass |
| Idempotency | 100% | Test T032, T079 pass |
| Error Handling | All errors mapped | All Airtel error codes have user-friendly messages |
| Documentation Complete | Yes | All tasks T081-T087 complete |
| Performance SLA | <5s POST, <200ms GET | Tests T077-T078 pass |
| Code Quality | No warnings | `npm run lint` passes |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Airtel API changes | Reference docs version 3.0 dated [user provided], contract test for format |
| PIN encryption complexity | Reference research.md decision, use standard RSA-OAEP |
| Multi-tenant data leak | Early T050 test, code review before Phase 4 |
| Performance regression | T077-T078 load tests, monitor in production |
| Undocumented Airtel behavior | Sandbox testing in Phase 2 (T021), reach out to Airtel support |

---

## Implementation Strategy

1. **Week 1**: Phases 1-2 (infrastructure + Airtel service)
2. **Week 2**: Phase 3 (core feature) + Phase 4 start (query endpoints)
3. **Week 3**: Phases 4-5 (query + error handling)
4. **Week 4**: Phases 6-7 (advanced features + testing + docs)

**Recommended starting point**: T001 (database setup)
