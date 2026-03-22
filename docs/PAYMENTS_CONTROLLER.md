# Payments Controller

This file documents the endpoints and logic found in `payments.controller.ts`.

## Overview
The `PaymentsController` is responsible for handling all payment-related API endpoints, enforcing multi-tenancy, and integrating with the pawaPay provider. All endpoints require tenant and API key headers, and most methods delegate to the `PaymentsService` with tenant scoping.

## Endpoints
- `POST /api/v1/payments` — Create a new payment
- `GET /api/v1/payments/status/:id` — Get payment status from pawaPay
- `GET /api/v1/payments/:id` — Retrieve a specific payment
- `GET /api/v1/payments/balance/available` — Get wallet balance for the tenant
- `POST /api/v1/payments/bulk-payouts` — Initiate bulk payouts
- `POST /api/v1/payments/payout-status` — Check payout status
- `POST /api/v1/payments/payout-resend-callback` — Resend payout callback
- `POST /api/v1/payments/payout-cancel` — Cancel enqueued payout
- `POST /api/v1/payments/deposit` — Initiate deposit
- `POST /api/v1/payments/deposit-status` — Check deposit status
- `POST /api/v1/payments/deposit-resend-callback` — Resend deposit callback
- `POST /api/v1/payments/refund` — Initiate refund
- `POST /api/v1/payments/refund-status` — Check refund status
- `POST /api/v1/payments/refund-resend-callback` — Resend refund callback
- `POST /api/v1/payments/payment-page` — Deposit via payment page
- `POST /api/v1/payments/provider-availability` — Check provider availability
- `POST /api/v1/payments/active-configuration` — Get active configuration
- `POST /api/v1/payments/predict-provider` — Predict provider
- `POST /api/v1/payments/public-keys` — Get public keys
- `POST /api/v1/payments/wallet-balances` — Get wallet balances

## Security
- All endpoints require `x-api-key` and `x-tenant-id` headers.
- Idempotency is enforced via the `Idempotency-Key` header (recommended for POST requests).
- Tenant isolation is strictly enforced in all methods.

## Notes
- All passthrough endpoints are scoped to the tenant and pawaPay provider.
- Error handling is performed for missing tenant ID and required fields.

---

*This documentation was auto-generated to summarize the structure and security of the PaymentsController as of March 21, 2026.*
