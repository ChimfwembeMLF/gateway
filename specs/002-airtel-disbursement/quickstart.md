# Quickstart Guide: Airtel Money Disbursements

**Feature**: Airtel Money payouts/disbursements  
**Version**: 1.0.0  
**Date**: February 5, 2026

---

## Overview

Send money from your business to customer Airtel Money wallets. Supports:
- Salary payments to employees
- Refunds to customers
- Bulk payouts
- B2C and B2B transactions

**Prerequisites**:
- Active tenant account with API key
- Airtel Money business account with disbursement enabled
- Airtel OAuth2 credentials (Client ID + Secret)
- 4-digit PIN for disbursement authorization

---

## Environment Setup

### Required Environment Variables

Add to your `.env` file:

```bash
# Airtel API Configuration (reused from collection integration)
AIRTEL_BASE_URL=https://openapiuat.airtel.co.zm  # Use https://openapi.airtel.co.zm for production
AIRTEL_CLIENT_ID=your_client_id
AIRTEL_CLIENT_SECRET=your_client_secret
AIRTEL_SIGNING_SECRET=your_signing_secret
AIRTEL_ENCRYPTION_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
Your RSA public key from Airtel
-----END PUBLIC KEY-----"

# Disbursement Configuration
AIRTEL_DISBURSEMENT_COUNTRY=ZM
AIRTEL_DISBURSEMENT_CURRENCY=ZMW
AIRTEL_DISBURSEMENT_PIN=1234  # 4-digit PIN for disbursement authorization
```

**Security Note**: Never commit actual credentials to version control. Use environment variables or secret management service (AWS Secrets Manager, etc.).

---

## Quick Start

### 1. Create a Disbursement

```bash
curl -X POST https://api.example.com/api/v1/disbursements \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "PAY-2024-001",
    "payeeMsisdn": "975123456",
    "amount": 5000.00,
    "currency": "ZMW",
    "reference": "January 2024 Salary",
    "pin": "1234",
    "walletType": "SALARY",
    "transactionType": "B2B"
  }'
```

**Response**:
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "externalId": "PAY-2024-001",
  "status": "PENDING",
  "amount": 5000.00,
  "currency": "ZMW",
  "payeeMsisdn": "975123456",
  "walletType": "SALARY",
  "transactionType": "B2B",
  "reference": "January 2024 Salary",
  "airtelReferenceId": "APC1234567",
  "createdAt": "2026-02-05T10:30:00Z"
}
```

### 2. Check Disbursement Status

```bash
curl -X GET https://api.example.com/api/v1/disbursements/f47ac10b-58cc-4372-a567-0e02b2c3d479 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response**:
```json
{
  "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "externalId": "PAY-2024-001",
  "status": "SUCCESS",
  "amount": 5000.00,
  "currency": "ZMW",
  "payeeMsisdn": "975123456",
  "airtelReferenceId": "APC1234567",
  "airtelMoneyId": "AM-987654321",
  "createdAt": "2026-02-05T10:30:00Z",
  "updatedAt": "2026-02-05T10:30:45Z"
}
```

### 3. List All Disbursements

```bash
curl -X GET "https://api.example.com/api/v1/disbursements?page=1&limit=20&status=SUCCESS" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response**:
```json
{
  "data": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "externalId": "PAY-2024-001",
      "status": "SUCCESS",
      "amount": 5000.00,
      "currency": "ZMW",
      "payeeMsisdn": "975123456",
      "createdAt": "2026-02-05T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

## Field Reference

### Request Fields

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| externalId | Yes | string | Your unique transaction ID (idempotency key) | "PAY-2024-001" |
| payeeMsisdn | Yes | string | Recipient's mobile number (no country code) | "975123456" |
| amount | Yes | number | Disbursement amount | 5000.00 |
| currency | Yes | string | Currency code (ISO 4217) | "ZMW" |
| reference | Yes | string | Business reference/description | "January Salary" |
| pin | Yes | string | 4-digit PIN (will be encrypted) | "1234" |
| walletType | No | enum | NORMAL, SALARY (default: NORMAL) | "SALARY" |
| transactionType | No | enum | B2C, B2B (default: B2C) | "B2B" |

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Gateway-generated disbursement ID |
| status | enum | PENDING, PROCESSING, SUCCESS, FAILED |
| airtelReferenceId | string | Airtel's reference ID |
| airtelMoneyId | string | Airtel Money transaction ID (when SUCCESS) |
| errorCode | string | Error code if FAILED |
| errorMessage | string | Human-readable error message |

---

## Common Use Cases

### Salary Payment

```json
{
  "externalId": "SALARY-EMP-123-JAN24",
  "payeeMsisdn": "975123456",
  "amount": 5000.00,
  "currency": "ZMW",
  "reference": "January 2024 Salary - Employee #123",
  "pin": "1234",
  "walletType": "SALARY",
  "transactionType": "B2B"
}
```

### Customer Refund

```json
{
  "externalId": "REFUND-ORDER-54321",
  "payeeMsisdn": "977654321",
  "amount": 250.50,
  "currency": "ZMW",
  "reference": "Refund for Order #54321",
  "pin": "1234",
  "walletType": "NORMAL",
  "transactionType": "B2C"
}
```

### Bulk Payouts

For bulk operations, loop through your payout list and create individual disbursements. Use a systematic `externalId` scheme for tracking:

```javascript
payouts.forEach(async (payout) => {
  await createDisbursement({
    externalId: `BULK-${batchId}-${payout.id}`,
    payeeMsisdn: payout.msisdn,
    amount: payout.amount,
    currency: 'ZMW',
    reference: `Bulk payout batch ${batchId}`,
    pin: process.env.DISBURSEMENT_PIN,
  });
});
```

---

## Idempotency

**Key Feature**: Duplicate `externalId` returns existing disbursement without creating duplicate.

```bash
# First request - creates disbursement
curl -X POST .../disbursements -d '{"externalId": "PAY-001", ...}'
# Returns: 201 Created

# Retry with same externalId - returns existing
curl -X POST .../disbursements -d '{"externalId": "PAY-001", ...}'
# Returns: 200 OK (same disbursement data)
```

**Best Practice**: Generate unique `externalId` values using:
- Order IDs: `REFUND-ORDER-12345`
- Timestamps: `PAY-2024-02-05-001`
- UUIDs: `PAY-a1b2c3d4-e5f6-7890`

---

## Error Handling

### Common Errors

| Status Code | Error | Cause | Solution |
|-------------|-------|-------|----------|
| 400 | MSISDN should not include country code | MSISDN starts with + or country code | Remove +260 prefix, use 975123456 |
| 400 | amount must be a positive number | Amount is 0 or negative | Use positive amount |
| 401 | Unauthorized | Invalid or missing API key | Check Authorization header |
| 404 | Disbursement not found | Wrong ID or tenant mismatch | Verify disbursement ID and tenant |
| 429 | Too Many Requests | Rate limit exceeded | Implement exponential backoff |

### Disbursement Failures

When `status` is `FAILED`, check `errorCode` and `errorMessage`:

```json
{
  "status": "FAILED",
  "errorCode": "WALLET_SUSPENDED",
  "errorMessage": "Recipient wallet is suspended"
}
```

**Common Error Codes**:
- `WALLET_SUSPENDED` - Recipient's wallet is blocked
- `INSUFFICIENT_BALANCE` - Your Airtel business account has insufficient funds
- `INVALID_MSISDN` - Recipient number is not a valid Airtel Money account
- `NETWORK_ERROR` - Temporary Airtel API issue (retry recommended)

---

## Testing

### Unit Tests

```bash
npm test -- disbursements
```

### E2E Tests

```bash
npm run test:e2e -- disbursements.e2e-spec
```

### Manual Testing (Sandbox)

Use Airtel's test environment:
- Base URL: `https://openapiuat.airtel.co.zm`
- Test MSISDN: `975000000` (or check Airtel sandbox docs)
- Test PIN: `1234`

**Example test disbursement**:
```bash
curl -X POST https://staging-api.example.com/api/v1/disbursements \
  -H "Authorization: Bearer STAGING_API_KEY" \
  -d '{
    "externalId": "TEST-001",
    "payeeMsisdn": "975000000",
    "amount": 100.00,
    "currency": "ZMW",
    "reference": "Test disbursement",
    "pin": "1234"
  }'
```

---

## Monitoring

### Recommended Polling

For `PENDING` disbursements, poll status endpoint:
- Initial: Check immediately after creation
- Early: Every 5 seconds for first minute
- Later: Every 30 seconds for next 5 minutes
- Final: Exponential backoff after 5 minutes

### Metrics to Track

- Disbursement success rate (target: >95%)
- Average completion time
- Failure reasons (categorize by errorCode)
- Daily/monthly volume

---

## Production Checklist

- [ ] Update `AIRTEL_BASE_URL` to production endpoint
- [ ] Obtain production Airtel credentials
- [ ] Store PIN securely (AWS Secrets Manager, etc.)
- [ ] Configure rate limiting appropriately
- [ ] Set up monitoring and alerting
- [ ] Test with small amounts first
- [ ] Implement retry logic with exponential backoff
- [ ] Add webhook support for real-time status updates (future)
- [ ] Review audit logs for compliance

---

## Support

**Documentation**: See [spec.md](spec.md) and [data-model.md](data-model.md)  
**API Reference**: See [contracts/disbursements-airtel.openapi.yaml](contracts/disbursements-airtel.openapi.yaml)  
**Issues**: Open a GitHub issue or contact support

---

## Next Steps

1. Set up environment variables
2. Test in sandbox environment
3. Implement disbursement logic in your application
4. Monitor and verify transactions
5. Go live with production credentials
