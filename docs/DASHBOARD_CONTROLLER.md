# Dashboard Controller

This file documents the endpoints, logic, and typical responses found in `dashboard.controller.ts`.

## Overview
The `DashboardController` acts as a secure proxy for the admin dashboard, exposing payment-related endpoints for tenant admins and users. It forwards requests to the Payments API, handling authentication, tenant scoping, and role-based access control.

## Endpoints and Responses

### User/Tenant Endpoints (require user credentials)

- **GET `/api/v1/admin/dashboard/payments`**
	- **Description:** Get all payments for the tenant
	- **Response:**
		```json
		[
			{
				"id": "string",
				"amount": 1000,
				"status": "SUCCESS",
				...
			}
		]
		```

- **POST `/api/v1/admin/dashboard/payments`**
	- **Description:** Create a new payment
	- **Request Body:** Payment DTO
	- **Response:**
		```json
		{
			"id": "string",
			"amount": 1000,
			"status": "PENDING",
			...
		}
		```

- **GET `/api/v1/admin/dashboard/payments/:id`**
	- **Description:** Get a payment by ID
	- **Response:**
		```json
		{
			"id": "string",
			"amount": 1000,
			"status": "SUCCESS",
			...
		}
		```

- **GET `/api/v1/admin/dashboard/payments/status/:id`**
	- **Description:** Get payment status by ID
	- **Response:**
		```json
		{
			"id": "string",
			"status": "SUCCESS",
			...
		}
		```

- **GET `/api/v1/admin/dashboard/payments/balance/available`**
	- **Description:** Get available wallet balance
	- **Response:**
		```json
		{
			"success": true,
			"data": {
				"balance": 5000,
				...
			}
		}
		```

### Admin-Only Endpoints (use backend credentials)

All admin-only endpoints return the proxied response from the Payments API, typically in the following format:

```json
{
	"success": true,
	"data": { ... }
}
```

- **POST `/api/v1/admin/dashboard/payments/bulk-payouts`**
- **POST `/api/v1/admin/dashboard/payments/payout-status`**
- **POST `/api/v1/admin/dashboard/payments/payout-resend-callback`**
- **POST `/api/v1/admin/dashboard/payments/payout-cancel`**
- **POST `/api/v1/admin/dashboard/payments/deposit`**
- **POST `/api/v1/admin/dashboard/payments/deposit-status`**
- **POST `/api/v1/admin/dashboard/payments/deposit-resend-callback`**
- **POST `/api/v1/admin/dashboard/payments/refund`**
- **POST `/api/v1/admin/dashboard/payments/refund-status`**
- **POST `/api/v1/admin/dashboard/payments/refund-resend-callback`**
- **POST `/api/v1/admin/dashboard/payments/payment-page`**
- **POST `/api/v1/admin/dashboard/payments/provider-availability`**
- **POST `/api/v1/admin/dashboard/payments/active-configuration`**
- **POST `/api/v1/admin/dashboard/payments/predict-provider`**
- **POST `/api/v1/admin/dashboard/payments/public-keys`**
- **POST `/api/v1/admin/dashboard/payments/wallet-balances`**

> **Note:** The exact response structure depends on the Payments API. Most endpoints return a JSON object with `success` and `data` fields, or a direct data object for resource fetches.

## Security
- User endpoints require authentication and extract API key/tenant ID from the user context.
- Admin endpoints use backend credentials from environment variables (`PAYMENT_API_KEY`, `TENANT_ID`).
- Role-based access enforced via `@Roles` and `@Auth` decorators.

## Notes
- All endpoints proxy requests to the Payments API, preserving tenant isolation.
- Error handling is performed for missing credentials or tenant information.
- Swagger decorators are used for API documentation.

---

*This documentation was auto-generated to summarize the structure, security, and typical responses of the DashboardController as of March 21, 2026.*
