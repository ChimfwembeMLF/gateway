# Data Model: Airtel Collection Payments Integration

## Entities

### Payment (existing)
- **Fields**: `id`, `tenantId`, `amount`, `currency`, `provider`, `externalId`, `status`, `momoTransactionId`, `createdAt`, `updatedAt`
- **Usage**: Store Airtel payment requests and initial provider acknowledgment.
- **Validation**:
  - `tenantId` required
  - `provider` includes `AIRTEL`
  - `externalId` required for idempotency

### Transaction (existing)
- **Fields**: `id`, `tenantId`, `payment`, `type`, `momoReferenceId`, `response`, `status`, `createdAt`
- **Usage**: Store Airtel provider responses (request-to-pay and status queries).

## Relationships
- Payment (1) ↔ Transaction (many)

## State Transitions
- **PENDING** → **SUCCESSFUL/FAILED** based on Airtel status updates

## Notes
- No new database entities are required for Airtel integration.
- Airtel provider responses should be stored in `Transaction.response` for auditing and troubleshooting.
