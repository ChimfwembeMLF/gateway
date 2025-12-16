# Multi-Tenancy Requirements for Payment Gateway

To adapt the current system for multi-tenant support, the following changes are required:

## 1. Data Model Changes
- Add a `tenantId` field to all relevant entities (User, Payment, Transaction, etc.).
- Create a `Tenant` entity/table to represent each organization/client.
- Associate each user and API key with a specific tenant.

## 2. Authentication & API Key
- API keys must be unique per tenant (optionally encode tenant info in the key).
- On each request, determine the tenant context (from API key, header, or subdomain).

## 3. Request Handling
- All queries and business logic must filter by `tenantId` to ensure data isolation.
- Users and API keys from one tenant must not access data from another tenant.

## 4. Registration & Onboarding
- Registration endpoints must accept or infer the tenant (e.g., invite code, tenant slug, or admin-created tenants).
- Optionally, allow self-service tenant creation ("Sign up your company").

## 5. Admin & Management
- Add endpoints for tenant management (create, update, list tenants).
- Allow tenant admins to manage users and API keys within their tenant.

## 6. Documentation
- Update API docs to describe tenant context requirements for all endpoints.

## 7. Optional: Advanced Isolation
- For strong isolation, consider separate databases or schemas per tenant ("database-per-tenant" or "schema-per-tenant" strategies).

---

**Summary:**
- Add `tenantId` to all entities and queries.
- Enforce tenant isolation in all business logic.
- Provide tenant management and onboarding flows.
- Update docs and API key handling for tenant context.

---

**Effort Note:**
- Basic multi-tenancy (single DB, tenantId) is achievable in a few days.
- Advanced isolation takes longer.
- The biggest work is updating all queries and enforcing tenant boundaries everywhere.
