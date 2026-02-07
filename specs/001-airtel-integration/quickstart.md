# Airtel Integration Quickstart

## Prerequisites
- Airtel API credentials (auth token, signing keys)
- Environment variables configured

## Environment Variables
```
AIRTEL_BASE_URL=https://openapiuat.airtel.co.zm
AIRTEL_COLLECTION_AUTH_TOKEN=...
AIRTEL_COLLECTION_X_SIGNATURE=...
AIRTEL_COLLECTION_X_KEY=...
AIRTEL_COLLECTION_COUNTRY=ZM
AIRTEL_COLLECTION_CURRENCY=ZMW
```

## Run Locally
1. Ensure `.env` is set with Airtel config.
2. Start the API server.
3. Call the unified payments endpoint with `provider=AIRTEL`:

```
POST /api/v1/payments
{
  "provider": "AIRTEL",
  "amount": 1000,
  "currency": "ZMW",
  "payer": "765725317",
  "payerMessage": "Test payment",
  "payeeNote": "Thank you"
}
```

## Notes
- MSISDN must be provided without country code (e.g., ZM: omit `260`).
- OAuth token and signing inputs must be configured according to Airtel documentation.
