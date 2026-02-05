# Implementation Plan: Airtel Collection Payments Integration

**Branch**: `001-airtel-integration` | **Date**: February 5, 2026 | **Spec**: [specs/001-airtel-integration/spec.md](specs/001-airtel-integration/spec.md)
**Input**: Feature specification from `/specs/001-airtel-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Integrate Airtel Money collection payments into the existing payment gateway by extending the unified payments endpoint to support `provider=AIRTEL`. The integration will add Airtel collection request handling, token-based authentication, message signing (if enabled), request/response normalization, and tenant-isolated persistence of provider responses.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.x / Node.js 20  
**Primary Dependencies**: NestJS 10.x, TypeORM 0.3.x, axios 1.x  
**Storage**: PostgreSQL (TypeORM entities for Payment/Transaction)  
**Testing**: Jest (unit/integration), Supertest (E2E)  
**Target Platform**: Linux server (Docker)  
**Project Type**: Backend API (NestJS modular service)  
**Performance Goals**: <200ms p95 for provider request initiation (excluding external latency)  
**Constraints**: External provider latency variability, message signing requirement, OAuth2 token expiry handling  
**Scale/Scope**: Multi-tenant SaaS, 100+ tenants, 10k+ payments/day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| Multi-Tenancy First | ✅ PASS | Airtel payments use existing Payment/Transaction entities with `tenantId` enforcement. |
| Security-First Architecture | ⚠️ PENDING | OAuth token endpoint + message signing details required to finalize secure request handling. |
| Provider-Agnostic Abstraction | ✅ PASS | Airtel handled via unified `/api/v1/payments` provider switch. |
| Audit Trail & Observability | ✅ PASS | Existing audit/logging strategy applies to Airtel payments. |
| Testing & Quality Gates | ⚠️ PENDING | Integration tests for Airtel collection flow not yet implemented. |

**GATE RESULT**: ⚠️ **PENDING** until OAuth/signing details are confirmed and integration tests added.

## Project Structure

### Documentation (this feature)

```text
specs/001-airtel-integration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── modules/
│   ├── airtel/
│   │   ├── airtel.module.ts
│   │   ├── collection/
│   │   │   └── airtel-collection.service.ts
│   │   └── dto/
│   │       └── airtel-payment.dto.ts
│   ├── payments/
│   │   ├── payments.service.ts
│   │   └── payments.module.ts
│   └── ...

config/
├── default.yaml
├── development.yaml
├── staging.yaml
└── production.yaml

test/
├── payments.e2e-spec.ts
└── ...
```

**Structure Decision**: Single NestJS backend project; Airtel provider module added under `src/modules/airtel` and wired into PaymentsService.

## Post-Design Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Multi-Tenancy First | ✅ PASS | Airtel uses existing tenant-scoped entities and guards. |
| Security-First Architecture | ⚠️ PENDING | OAuth2 token flow and message signing details still required. |
| Provider-Agnostic Abstraction | ✅ PASS | Unified payments endpoint with provider switch preserved. |
| Audit Trail & Observability | ✅ PASS | Provider responses stored in transactions; logging hooks exist. |
| Testing & Quality Gates | ⚠️ PENDING | Airtel integration tests pending once auth/signing details are known. |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
