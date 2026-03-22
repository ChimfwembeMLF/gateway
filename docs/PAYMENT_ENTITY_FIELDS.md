# Payment Entity: Field Documentation

This document describes the fields of the `Payment` entity as of March 2026, following the pawaPay MNO integration and refactor.

## Fields

| Field                   | Type                | Description                                                                                 |
|------------------------|---------------------|---------------------------------------------------------------------------------------------|
| id                     | string (UUID)       | Unique identifier (inherited from AbstractEntity)                                           |
| tenantId               | string              | Tenant/organization identifier                                                              |
| amount                 | number (decimal)    | Payment amount                                                                              |
| currency               | string              | ISO currency code (e.g., 'ZMW', 'EUR')                                                      |
| externalId             | string              | External reference for idempotency                                                          |
| payer                  | string              | Payer's phone number or account                                                             |
| payerMessage           | string (nullable)   | Message from payer (optional)                                                               |
| payeeNote              | string (nullable)   | Note to payee (optional)                                                                    |
| flow                   | enum                | PaymentFlow: 'COLLECTION' or 'DISBURSEMENT'                                                 |
| provider               | enum                | PaymentProvider: e.g., 'PAWAPAY'                                                            |
| network                | enum (nullable)     | ZambiaNetwork: 'MTN', 'AIRTEL', 'ZAMTEL' (target MNO for Zambia)                            |
| status                 | enum                | PaymentStatus: 'PENDING', 'SUCCESSFUL', 'FAILED'                                            |
| providerTransactionId  | string (nullable)   | Transaction/reference ID from the payment provider                                          |
| metadata               | JSONB (nullable)    | Arbitrary metadata for extensibility (raw provider responses, extra info, etc.)             |
| transactions           | Transaction[]       | Linked transactions (request, status, etc.)                                                 |
| createdAt              | Date                | Timestamp of creation (inherited from AbstractEntity)                                       |
| updatedAt              | Date                | Timestamp of last update (inherited from AbstractEntity)                                    |

## Indexes
- tenantId
- externalId
- providerTransactionId
- provider
- network

## Notes
- All status fields use enums for type safety and clarity.
- The entity is now provider-agnostic and supports all MNOs via pawaPay.
- Use the `metadata` field for any provider-specific or extensible data.

---
For further details, see the migration script and DTO definitions.