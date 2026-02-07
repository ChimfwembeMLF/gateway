# Implementation Plan: Airtel Money Disbursements

**Branch**: `002-airtel-disbursement` | **Date**: February 5, 2026 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/002-airtel-disbursement/spec.md`

## Summary

Add Airtel Money disbursement functionality to enable businesses (tenants) to send payouts to customer wallets. Leverages existing Airtel OAuth2/signing infrastructure from collection integration. Implements unified payment interface pattern with multi-tenant isolation, audit trail, and idempotency guarantees.

## Technical Context

**Language/Version**: TypeScript 5.x with Node.js 20  
**Primary Dependencies**: NestJS 10.x, TypeORM 0.3.x, axios for Airtel API calls, crypto for signing  
**Storage**: PostgreSQL with TypeORM entities (Disbursement, DisbursementStatus enum)  
**Testing**: Jest for unit tests, Supertest for E2E tests  
**Target Platform**: Linux server (Docker containers)  
**Project Type**: Single NestJS backend API  
**Performance Goals**: <5 seconds for disbursement initiation, handle 100 concurrent requests  
**Constraints**: <200ms p95 for database queries, multi-tenant isolation mandatory, idempotency required  
**Scale/Scope**: Support 1000+ tenants, 10k+ disbursements per day per tenant

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence / Action Required |
|-----------|--------|----------------------------|
| **Multi-Tenancy First** | ✅ PASS | Disbursement entity will include `tenantId` field with index. All queries filter by tenant. API requires `x-tenant-id` header via ApiKeyGuard. |
| **Security-First** | ✅ PASS | Reuses existing ApiKeyGuard, requires API key authentication. PIN encryption handled by Airtel auth service. Input validation via DTOs. |
| **Provider-Agnostic** | ✅ PASS | Implements unified disbursement interface alongside collection. Provider-specific logic isolated in AirtelDisbursementService. |
| **Audit Trail** | ⚠️ PENDING | Must use existing AuditSubscriber to log disbursement state changes. Note: Audit entity needs `tenantId` fix (separate issue). |
| **Testing** | ⚠️ PENDING | Must add unit tests for DisbursementService, integration tests for Airtel API calls, E2E tests for tenant isolation. |

**Gates:**
- ❌ If Audit entity lacks `tenantId`: ERROR - cannot proceed until fixed (separate fix required)
- ⚠️ If tests not written in Phase 1: WARNING - must complete before merge

## Project Structure

### Documentation (this feature)

```text
specs/002-airtel-disbursement/
├── plan.md              # This file
├── research.md          # Phase 0: Decisions on PIN encryption, wallet types
├── data-model.md        # Phase 1: Disbursement entity schema
├── quickstart.md        # Phase 1: Setup and usage guide
├── contracts/           # Phase 1: OpenAPI spec for disbursement endpoints
│   └── disbursements-airtel.openapi.yaml
└── checklists/
    └── requirements.md  # Spec quality checklist (already complete)
```

### Source Code (repository root)

```text
src/
├── common/
│   └── enums/
│       └── disbursement-status.enum.ts    # PENDING, SUCCESS, FAILED, PROCESSING
├── modules/
│   ├── airtel/
│   │   ├── airtel.module.ts               # Add DisbursementService to exports
│   │   ├── auth/
│   │   │   └── airtel-auth.service.ts     # Existing OAuth2 token service (reuse)
│   │   ├── signing/
│   │   │   └── airtel-signing.service.ts  # Existing signing service (reuse)
│   │   ├── disbursement/
│   │   │   ├── airtel-disbursement.service.ts    # New: Airtel disbursement API calls
│   │   │   └── airtel-disbursement.service.spec.ts
│   │   └── dto/
│   │       └── airtel-disbursement.dto.ts  # Request/response DTOs
│   └── disbursements/
│       ├── disbursements.module.ts         # New module
│       ├── disbursements.controller.ts     # REST endpoints
│       ├── disbursements.service.ts        # Business logic, provider abstraction
│       ├── disbursements.controller.spec.ts
│       ├── disbursements.service.spec.ts
│       ├── entities/
│       │   └── disbursement.entity.ts      # TypeORM entity with tenantId
│       └── dto/
│           ├── create-disbursement.dto.ts
│           └── disbursement-response.dto.ts
test/
└── disbursements.e2e-spec.ts               # Multi-tenant isolation tests
```

**Structure Decision**: Single NestJS backend. New `disbursements` module mirrors existing `payments` architecture for consistency. Airtel-specific logic in `airtel/disbursement` submodule, reusing existing auth/signing services.

## Complexity Tracking

> No violations - all design choices align with constitution requirements.

---

## Phase 0: Research & Decision Making

**Objective**: Resolve all "NEEDS CLARIFICATION" items from Technical Context.

### Research Tasks

1. **PIN Encryption Method**
   - **Question**: How to encrypt 4-digit PIN for Airtel disbursement API?
   - **Research**: Check Airtel documentation for encryption algorithm (likely AES or RSA with provided key)
   - **Decision Needed**: Implementation approach - use crypto module or library

2. **Wallet Types and Transaction Types**
   - **Question**: What are valid values for `wallet_type` and transaction `type` fields?
   - **Research**: Document from Airtel API spec - NORMAL, SALARY, etc. for wallet_type; B2C, B2B for transaction type
   - **Decision Needed**: Default values and validation rules

3. **Idempotency Strategy**
   - **Question**: How to prevent duplicate disbursements for same transaction ID?
   - **Research**: Best practices for idempotency in payment APIs (database unique constraint, status check before retry)
   - **Decision Needed**: Implementation pattern matching existing payment idempotency

4. **Status Polling vs Webhooks**
   - **Question**: How to get final disbursement status from Airtel?
   - **Research**: Airtel webhook support for disbursements, polling endpoint availability
   - **Decision Needed**: Primary status update mechanism

**Output**: `research.md` documenting all decisions with rationale.

---

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete

### Data Model

**Entity**: Disbursement

```typescript
// Preliminary schema - details in data-model.md
{
  id: uuid primary key
  tenantId: string indexed
  externalId: string unique per tenant (idempotency key)
  payeeMsisdn: string
  walletType: enum (NORMAL, SALARY, etc.)
  amount: decimal
  currency: string
  reference: string
  encryptedPin: string
  transactionType: enum (B2C, B2B)
  status: DisbursementStatus enum
  airtelReferenceId: string nullable
  airtelMoneyId: string nullable
  errorCode: string nullable
  errorMessage: string nullable
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: tenantId, externalId, status, createdAt

### API Contracts

**Endpoints**:

1. `POST /api/v1/disbursements` - Create disbursement
   - Request: payee MSISDN, amount, currency, wallet_type, transaction type, reference, PIN
   - Response: transaction ID, status, Airtel reference
   
2. `GET /api/v1/disbursements/:id` - Query disbursement status
   - Response: Full disbursement details including current status
   
3. `GET /api/v1/disbursements` - List tenant's disbursements
   - Query params: page, limit, status filter, date range
   - Response: Paginated list of disbursements

**Contract Output**: OpenAPI spec in `contracts/disbursements-airtel.openapi.yaml`

### Integration Points

- **Reuse from Collection**: AirtelAuthService (OAuth2), AirtelSigningService (x-signature, x-key)
- **New Service**: AirtelDisbursementService (disbursement API calls)
- **Unified Interface**: DisbursementsService abstracts provider-specific logic

### Agent Context Update

After generating contracts and data model:
```bash
./.specify/scripts/bash/update-agent-context.sh copilot
```

Adds:
- Airtel disbursement module structure
- New entity: Disbursement
- New endpoints: POST/GET disbursements
- Dependencies: Existing Airtel auth/signing services

**Output**: 
- `data-model.md` - Full entity schemas with relationships
- `contracts/disbursements-airtel.openapi.yaml` - OpenAPI 3.0 spec
- `quickstart.md` - Setup instructions, environment variables, testing guide
- Updated `.specify/memory/copilot.md` - Agent context

---

## Post-Design Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| **Multi-Tenancy First** | ✅ PASS | Disbursement entity has tenantId with index. All endpoints require ApiKeyGuard. Queries filter by tenant. |
| **Security-First** | ✅ PASS | API key required. PIN encrypted before storage/transmission. Input validation via DTOs. Rate limiting applies. |
| **Provider-Agnostic** | ✅ PASS | DisbursementsService provides unified interface. Airtel-specific logic isolated. Future providers can implement same interface. |
| **Audit Trail** | ✅ PASS | AuditSubscriber will log all Disbursement entity changes (INSERT, UPDATE). Includes tenantId, timestamps, state transitions. |
| **Testing** | ⚠️ PENDING | Unit tests for services, E2E tests for tenant isolation, contract tests for Airtel API - to be written during implementation. |

**Final Gate**: ✅ APPROVED for Phase 2 (task breakdown)

---

## Next Steps

1. Review this plan for accuracy and completeness
2. Proceed to Phase 0: Generate `research.md`
3. Proceed to Phase 1: Generate `data-model.md`, `contracts/`, `quickstart.md`
4. After Phase 1: Run agent context update script
5. **Stop here** - Phase 2 (task breakdown) is a separate command: `/speckit.tasks`
