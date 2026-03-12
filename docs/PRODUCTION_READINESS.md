# Production Readiness Checklist

This document lists the minimal work required before allowing third-party integrations.

## 1) Configuration & Secrets
- Move all secrets (DB, JWT, MTN keys) out of config/*.yaml; load from environment.
- Add env validation (e.g., class-validator + ConfigModule) to fail fast on missing values.
- Remove insecure defaults (e.g., jwt.secret fallback "changeme").

## 2) Security & Hardening
- Enable global ValidationPipe (whitelist, forbidNonWhitelisted, transform) in main.ts.
- Add Helmet, CORS with allowed origins, and rate limiting (@nestjs/throttler).
- Replace console logging with Nest Logger; add request/response logging middleware.
- Add a global exception filter for consistent error shapes.

## 3) Auth & Tenant Isolation
- Fix ApiKeyGuard to call a UsersService method (no direct repo access) and enforce tenant scoping.
- Ensure every query filters by tenantId; add guards/interceptors if needed.
- Rotate/regenerate API keys endpoint and document usage; audit access.

## 4) Database Safety
- Set synchronize: false everywhere; rely on migrations only.
- Add and run initial migrations matching current schema; add migration docs/command to README.
- Configure connection via DATABASE_URL and per-env overrides.

## 5) Payments & Webhooks
- Document MTN webhook endpoint and expected payloads; verify signature/secret if supported.
- Add idempotency for externalId / X-Reference-Id to avoid duplicates.
- Add retry/backoff handling for provider calls; classify and map provider errors.
- Add status polling + webhook processing tests.

## 6) Observability & Ops
- Add health/readiness endpoints for k8s/docker-compose.
- Add structured logging (e.g., pino/winston) with log levels per env.
- Add metrics (Prometheus) for requests, errors, provider latency, and webhook outcomes.

## 7) Testing & QA
- Add unit tests: auth, api-key guard, payments service (happy/error paths), tenant isolation.
- Add e2e tests for /auth, /payments (MTN requestToPay), and multi-tenant data isolation.
- Add contract tests for webhook handler.

## 8) Documentation & DX
- Refresh README/INTEGRATION_GUIDE with env vars, run commands, and webhook details.
- Add API examples for each provider; clarify required headers (Authorization, x-tenant-id).
- Provide migration/test scripts in package.json and CI sample.

## 9) Deployment
- Harden Dockerfile: use non-root user; cache deps; prune dev deps; verify CMD path.
- Add CI/CD pipeline with lint/test/build steps and image publish; sign images if possible.
- Configure env per environment (dev/stage/prod) and secrets store (vault/SSM/Key Vault).

## 10) Risk Items to Verify
- Secrets not committed; JWT secret set; MTN keys per env.
- Tenant isolation enforced on every DB query.
- Webhook endpoint secured (auth or allowlist) and idempotent.
- Database migrations in place; no synchronize in production.
- Monitoring, alerting, and log aggregation configured.

## Zambia Integration Notes
- Use MTN MoMo Zambia sandbox/prod keys via environment variables; do not keep them in config/*.yaml.
- Default currency for pay-ins is ZMW; MSISDN format: 2609xxxxxxx.
- Register to get API key (POST /api/v1/auth/register), then call /api/v1/payments with headers `Authorization: Bearer <api_key>` and `x-tenant-id: <tenantId>`.
- Enable CORS/Helmet/rate limiting and ValidationPipe before exposing publicly.
- For Airtel/Zamtel later: add provider adapters reusing the unified /api/v1/payments endpoint with tenant scoping and idempotent externalIds.
