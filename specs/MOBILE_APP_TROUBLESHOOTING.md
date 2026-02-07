# Mobile App Request Troubleshooting Guide

## Issue: "Failed to fetch" Error on POST /api/v1/payments

### Request Analysis
Your mobile app is correctly sending a POST request to `/api/v1/payments` with:
- ✅ Correct HTTP method: POST
- ✅ All required headers: x-tenant-id, x-api-key, Authorization
- ✅ Valid idempotency key
- ✅ Correct JSON body

### Common Causes for "Failed to fetch"

#### 1. **Server Connection Issues**
```
Error: ClientException: Failed to fetch, uri=http://localhost:3000/api/v1/payments
```

**Solutions:**
- Verify the server is running: `npm run start:dev`
- Check if port 3000 is accessible
- For mobile on emulator connecting to host: use `http://10.0.2.2:3000` (Android) or `http://localhost:3000` (iOS)
- For physical device: use actual IP address like `http://192.168.x.x:3000`

#### 2. **API Key Validation Issues**
Your request includes API key: `tenant_454a29973c882...`

**Verify:**
```typescript
// Ensure API key is valid
const apiKey = 'tenant_454a29973c882...'; // Full key needed
const tenantId = 'test';

// The API key must:
// 1. Exist in database (created during tenant setup)
// 2. Belong to the tenant specified in x-tenant-id header
// 3. Be currently active
```

#### 3. **Tenant ID Mismatch**
Your request sends: `x-tenant-id: test`

**Verify:**
```bash
# Check if tenant 'test' exists and is active
# Query the database or use admin endpoints
SELECT * FROM tenants WHERE name = 'test' OR id = 'test';
```

#### 4. **Authentication Token Issues**
Your Bearer token: `eyJhbGciOiJIUzI1NiIs...`

**Verify:**
```typescript
// Ensure token is:
// 1. Valid JWT format
// 2. Not expired
// 3. Issued for the correct tenant
// 4. User is active
```

### Checklist for Mobile App

```typescript
// Before making payment request, verify:

async function verifyBeforePayment(client: PaymentGatewayClient) {
  try {
    // 1. Check server is accessible
    const healthCheck = await client.health.check();
    console.log('✓ Server is running');

    // 2. Check authentication is valid
    const user = await client.auth.getMe();
    console.log('✓ Auth token is valid:', user.data?.email);

    // 3. Check merchant configuration
    const config = await client.merchant.getConfiguration();
    console.log('✓ Merchant configured');
    console.log('✓ Tenant ID:', config.data?.tenantId);
    console.log('✓ MTN Active:', config.data?.mtnAccountActive);

    // 4. Check balance
    const balance = await client.payments.getBalance('mtn');
    console.log('✓ Balance available:', balance.data?.balance);

    return true;
  } catch (error) {
    console.error('Pre-flight check failed:', error);
    return false;
  }
}
```

### Testing the Endpoint Directly

#### Using cURL:
```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Content-Type: application/json" \
  -H "x-api-key: tenant_454a29973c882c05233eed409f2410d7ec38f933fff8a48b4dc02d9879345698" \
  -H "x-tenant-id: test" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Idempotency-Key: 4e10aa6a-9634-40f5-b9f1-f595bea89a26" \
  -d '{
    "amount": 10000,
    "currency": "RWF",
    "phoneNumber": "+260964444200",
    "externalId": "pay-1770466617221",
    "description": "Payment from RemPay",
    "provider": "mtn"
  }'
```

#### Using Postman:
1. Create new POST request to `http://localhost:3000/api/v1/payments`
2. Add Headers:
   - `x-api-key: your-api-key`
   - `x-tenant-id: test`
   - `Authorization: Bearer your-token`
   - `Idempotency-Key: your-uuid`
3. Set Body (raw JSON):
```json
{
  "amount": 10000,
  "currency": "RWF",
  "phoneNumber": "+260964444200",
  "externalId": "pay-1770466617221",
  "description": "Payment from RemPay",
  "provider": "mtn"
}
```
4. Send and check response

### Mobile App Implementation Pattern

```typescript
import { PaymentGatewayClient } from './api/mobile-app-api-client';

class PaymentGatewayService {
  private client: PaymentGatewayClient;

  constructor(baseUrl: string = 'http://localhost:3000/api/v1') {
    this.client = new PaymentGatewayClient({ baseUrl });
  }

  async initializeWithCredentials(email: string, password: string) {
    try {
      // Step 1: Login
      const authResponse = await this.client.auth.login({
        email,
        password,
      });

      if (!authResponse.data) {
        throw new Error('Login failed');
      }

      // Step 2: Store credentials securely
      const token = authResponse.data.accessToken;
      const tenantId = authResponse.data.user.tenantId;
      
      // Save to secure storage
      await this.saveCredentials({
        token,
        tenantId,
        apiKey: this.getApiKeyFromEnv(),
      });

      // Step 3: Initialize client for API calls
      this.client.setAccessToken(token);
      this.client.setTenantId(tenantId);

      return true;
    } catch (error) {
      console.error('Initialization failed:', error);
      return false;
    }
  }

  async createPayment(amount: number, phoneNumber: string) {
    try {
      // Verify connection first
      const health = await this.client.health.check();
      console.log('Server healthy:', health);

      // Create payment
      const response = await this.client.payments.create(
        {
          amount,
          currency: 'RWF',
          phoneNumber,
          externalId: `PAY-${Date.now()}`,
          provider: 'mtn',
        },
        {
          idempotencyKey: this.generateUUID(),
        },
      );

      if (response.data) {
        console.log('Payment created:', response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Payment creation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Handle specific error types
      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          // Token expired, need re-login
          this.client.clearAuth();
        }
      }
      throw error;
    }
  }

  private getApiKeyFromEnv(): string {
    // Get from environment or secure storage
    return process.env.REACT_APP_API_KEY || '';
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async saveCredentials(creds: any) {
    // Implement secure storage
    // Use react-native-keychain, expo-secure-store, etc.
  }
}

export default PaymentGatewayService;
```

### Server Debugging

If the issue persists, check server logs:

```bash
# Start server with debug logs
NODE_DEBUG=* npm run start:dev

# Check specific service
tail -f logs/payments.log

# Verify database connectivity
npm run typeorm migration:show
npm run typeorm query:show
```

### Network Configuration for Different Environments

**Local Development:**
```typescript
const client = new PaymentGatewayClient({
  baseUrl: 'http://localhost:3000/api/v1'
});
```

**Android Emulator:**
```typescript
const client = new PaymentGatewayClient({
  baseUrl: 'http://10.0.2.2:3000/api/v1' // Host machine IP
});
```

**iOS Simulator:**
```typescript
const client = new PaymentGatewayClient({
  baseUrl: 'http://localhost:3000/api/v1'
});
```

**Physical Device (Local Network):**
```typescript
const client = new PaymentGatewayClient({
  baseUrl: 'http://192.168.1.100:3000/api/v1' // Your machine's IP
});
```

**Staging/Production:**
```typescript
const client = new PaymentGatewayClient({
  baseUrl: process.env.REACT_APP_API_URL
});
```

### Next Steps

1. Verify server is running: `npm run start:dev`
2. Test endpoint with cURL first
3. Check server logs for error details
4. Verify API key and tenant configuration
5. Use health endpoint to validate connection
6. Enable detailed logging in mobile app

If issue persists, share:
- Server console logs
- Full error stack trace from mobile app
- Network tab from browser dev tools (if web)
- Exact API key and tenant ID being used
