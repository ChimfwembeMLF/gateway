# Research: Airtel Collection Payments Integration

## Decision 1: Provider Integration Approach
- **Decision**: Implement Airtel collection as a dedicated module (`AirtelCollectionService`) and route through the unified `/api/v1/payments` flow with `provider=AIRTEL`.
- **Rationale**: Preserves provider-agnostic abstraction and reuses existing Payment/Transaction persistence.
- **Alternatives considered**: Creating a separate Airtel-only endpoint (rejected because it breaks provider abstraction).

## Decision 2: Config & Environment Strategy
- **Decision**: Use YAML config with environment variable placeholders for Airtel base URL and security headers (`auth_token`, `x_signature`, `x_key`, country, currency).
- **Rationale**: Aligns with existing configuration and constitution requirement to externalize secrets.
- **Alternatives considered**: Hardcoding sandbox values (rejected for security).

## Decision 3: Request/Response Normalization
- **Decision**: Map gateway `CreatePaymentDto` to Airtel request structure (reference, subscriber, transaction) and normalize MSISDN to remove country code.
- **Rationale**: Airtel API requires MSISDN without country code; consistent normalization prevents provider rejection.
- **Alternatives considered**: Require callers to pre-normalize MSISDN (rejected to keep API consistent).

## Decision 4: OAuth2 Token & Message Signing
- **Decision**: **NEEDS CLARIFICATION** — Airtel OAuth2 token endpoint, token scope, and message signing algorithm are required.
- **Rationale**: Airtel requires OAuth2 authentication and optional signing; implementation depends on provider spec.
- **Alternatives considered**: Static bearer token in config (rejected for production; acceptable only for local testing).

## Decision 5: Status Query & Refund APIs
- **Decision**: **NEEDS CLARIFICATION** — Airtel status endpoint paths, request schema, and signing requirements are required.
- **Rationale**: Needed for reconciliation and support workflows.
- **Alternatives considered**: Relying on callbacks only (rejected; status query required for support tooling).
