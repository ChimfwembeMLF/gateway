# Airtel Money Integration - Environment Setup

## Required Environment Variables

Add these to your `.env` file or environment configuration:

```bash
# Airtel API Configuration
AIRTEL_BASE_URL=https://openapiuat.airtel.co.zm  # Use https://openapi.airtel.co.zm for production
AIRTEL_CLIENT_ID=your_client_id_from_developer_portal
AIRTEL_CLIENT_SECRET=your_client_secret_from_developer_portal

# Airtel Signing & Encryption
AIRTEL_SIGNING_SECRET=your_hmac_signing_secret
AIRTEL_ENCRYPTION_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
Your RSA public key from Airtel
-----END PUBLIC KEY-----"

# Collection Configuration
AIRTEL_COLLECTION_COUNTRY=ZM
AIRTEL_COLLECTION_CURRENCY=ZMW
```

## Getting Credentials from Airtel Developer Portal

1. **Login to Airtel Developer Portal**
   - Navigate to your application (RempayMerchant - B0GD06X1)
   - Ensure you're in TEST mode

2. **Get OAuth2 Credentials**
   - Go to **Key Management** section
   - Copy **Client ID** → Use as `AIRTEL_CLIENT_ID`
   - Copy **Client Secret Key** → Use as `AIRTEL_CLIENT_SECRET`

3. **Get Signing Secret**
   - Check API documentation or developer portal for HMAC signing key
   - This is used to generate `x-signature` header

4. **Get RSA Public Key**
   - Download or copy the RSA public key from the portal
   - This is used to encrypt the AES key for `x-key` header

## How It Works

### OAuth2 Authentication Flow
1. System exchanges `client_id` + `client_secret` for bearer token
2. Token is cached with automatic refresh before expiry
3. Bearer token added to `Authorization: Bearer XXX` header

### Message Signing (`x-signature`)
1. Request payload is serialized to JSON
2. HMAC-SHA256 signature computed using signing secret
3. Signature base64-encoded and added to `x-signature` header

### Key Encryption (`x-key`)
1. Random AES-256 key and IV generated
2. Key+IV encrypted with Airtel's RSA public key
3. Encrypted data base64-encoded and added to `x-key` header

## Testing

Run unit tests:
```bash
npm test -- airtel
```

Test payment request:
```bash
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-tenant-api-key" \
  -d '{
    "provider": "AIRTEL",
    "amount": 100,
    "msisdn": "123456789",
    "currency": "ZMW",
    "reference": "Test payment"
  }'
```

## Production Checklist

- [ ] Obtain production credentials from Airtel
- [ ] Update `AIRTEL_BASE_URL` to `https://openapi.airtel.co.zm`
- [ ] Store all credentials in secure secret management (AWS Secrets Manager, etc.)
- [ ] Enable message signing in Airtel Developer Portal settings
- [ ] Test with small amounts before going live
- [ ] Set up monitoring and alerting for failed transactions
- [ ] Implement webhook handler for payment status updates
