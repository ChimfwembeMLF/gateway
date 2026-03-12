# Payment Gateway - All Exposed Endpoints

## Authentication Module
**Base:** `/api/v1/auth`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | User login |
| POST | `/register` | User registration |
| POST | `/refresh` | Refresh JWT token |
| POST | `/logout` | User logout |

---

## Merchant Configuration Module ✨ NEW
**Base:** `/api/v1/merchant/configuration`
**Auth:** Required (Bearer token + X-Tenant-Id)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **POST** | `/` | Create merchant configuration |
| **GET** | `/` | Get merchant configuration |
| **PATCH** | `/` | Update merchant configuration |
| **POST** | `/verify/mtn` | Verify MTN credentials |
| **POST** | `/verify/airtel` | Verify Airtel credentials |
| **POST** | `/verify/bank` | Verify bank account |
| **POST** | `/webhook/test` | Test webhook endpoint |

**Request/Response Examples:**

### Create Configuration
```bash
POST /api/v1/merchant/configuration
Authorization: Bearer {token}
X-Tenant-Id: kangwa
Content-Type: application/json

{
  "businessName": "Acme Corporation Ltd",
  "businessRegistrationNumber": "BRN-123456",
  "businessCategory": "E-Commerce",
  "contactPersonName": "John Doe",
  "contactPersonEmail": "contact@acme.com",
  "mtnCollectionSubscriptionKey": "...",
  "mtnCollectionApiKey": "...",
  "mtnCollectionXReferenceId": "merchant-ref-001",
  "airtelClientId": "...",
  "airtelClientSecret": "...",
  "bankAccountHolder": "Acme Corporation",
  "bankAccountNumber": "1234567890",
  "bankName": "Zambia National Bank",
  "webhookUrl": "https://acme.com/webhooks",
  "maxDailyCollections": 10000,
  "maxTransactionAmount": 50000
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "kangwa",
  "businessName": "Acme Corporation Ltd",
  "businessRegistrationNumber": "BRN-123456",
  "businessCategory": "E-Commerce",
  "contactPersonName": "John Doe",
  "contactPersonEmail": "contact@acme.com",
  "mtnAccountActive": false,
  "mtnLastVerified": null,
  "airtelAccountActive": false,
  "airtelLastVerified": null,
  "bankAccountVerified": false,
  "bankName": "Zambia National Bank",
  "kycStatus": "PENDING",
  "webhookEnabled": true,
  "encryptionStatus": "ENCRYPTED",
  "maxDailyCollections": 10000,
  "maxTransactionAmount": 50000,
  "isActive": true,
  "createdAt": "2026-02-06T17:00:00.000Z",
  "updatedAt": "2026-02-06T17:00:00.000Z"
}
```

### Get Configuration
```bash
GET /api/v1/merchant/configuration
Authorization: Bearer {token}
X-Tenant-Id: kangwa
```

### Update Configuration
```bash
PATCH /api/v1/merchant/configuration
Authorization: Bearer {token}
X-Tenant-Id: kangwa
Content-Type: application/json

{
  "maxDailyCollections": 50000,
  "maxTransactionAmount": 100000,
  "businessName": "Updated Name"
}
```

### Verify MTN Credentials
```bash
POST /api/v1/merchant/configuration/verify/mtn
Authorization: Bearer {token}
X-Tenant-Id: kangwa
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "MTN credentials verified successfully"
}
```

### Verify Airtel Credentials
```bash
POST /api/v1/merchant/configuration/verify/airtel
Authorization: Bearer {token}
X-Tenant-Id: kangwa
```

### Verify Bank Account
```bash
POST /api/v1/merchant/configuration/verify/bank
Authorization: Bearer {token}
X-Tenant-Id: kangwa
```

### Test Webhook
```bash
POST /api/v1/merchant/configuration/webhook/test
Authorization: Bearer {token}
X-Tenant-Id: kangwa
Content-Type: application/json

{
  "eventType": "payment.success"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Webhook test successful"
}
```

---

## Payments Module
**Base:** `/api/v1/payments`
**Auth:** Required (API Key + Tenant ID)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create payment (collection) |
| GET | `/` | List payments |
| GET | `/:id` | Get payment details |
| GET | `/balance/available` | Get available balance |

---

## Disbursements Module
**Base:** `/api/v1/disbursements`
**Auth:** Required (API Key + Tenant ID)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create disbursement (payout) |
| GET | `/` | List disbursements |
| GET | `/:id` | Get disbursement details |
| GET | `/status/:id` | Get disbursement status |

---

## MTN Module
**Base:** `/api/v1/mtn`
**Auth:** Required

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/apiuser` | Create MTN API user |
| POST | `/apikey/:referenceId` | Create MTN API key |
| POST | `/token` | Generate MTN bearer token |
| GET | `/getClientDetails/:phone` | Get MTN client details |
| GET | `/balance` | Get MTN account balance |

---

## Health Module
**Base:** `/health`
**Auth:** Optional

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Basic health check |
| GET | `/ready` | Readiness probe |
| GET | `/live` | Liveness probe |
| GET | `/detailed` | Detailed health status |

---

## User Module
**Base:** `/api/v1/users`
**Auth:** Required

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create user |
| GET | `/` | List users |
| GET | `/:id` | Get user details |
| PATCH | `/:id` | Update user |
| DELETE | `/:id` | Delete user |

---

## Tenant Module
**Base:** `/api/v1/tenants`
**Auth:** Required (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create tenant |
| GET | `/` | List tenants |
| GET | `/:id` | Get tenant details |
| PATCH | `/:id` | Update tenant |
| DELETE | `/:id` | Delete tenant |

---

## Billing Module
**Base:** `/api/v1/billing`
**Auth:** Required

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/plans` | List billing plans |
| GET | `/plans/:id` | Get plan details |
| POST | `/subscriptions` | Create subscription |
| GET | `/subscriptions` | List subscriptions |
| GET | `/subscriptions/:id` | Get subscription details |
| GET | `/usage` | Get usage metrics |
| GET | `/invoices` | List invoices |

---

## Complete Endpoint Summary

### Total Endpoints by Module

| Module | Count | Status |
|--------|-------|--------|
| Auth | 4 | ✅ Active |
| **Merchant Configuration** | **7** | **✨ NEW** |
| Payments | 4 | ✅ Active |
| Disbursements | 4 | ✅ Active |
| MTN | 5 | ✅ Active |
| Health | 4 | ✅ Active |
| Users | 5 | ✅ Active |
| Tenants | 5 | ✅ Active |
| Billing | 7 | ✅ Active |
| **TOTAL** | **45** | |

---

## Module Registration Status

### AppModule Imports ✅

```typescript
@Module({
  imports: [
    HttpModule,
    ConfigModule,
    TypeOrmModule,
    ThrottlerModule,
    ScheduleModule,
    AuthModule,              // ✅ Registered
    UserModule,              // ✅ Registered
    PaymentsModule,          // ✅ Registered
    TransactionModule,       // ✅ Registered
    TenantModule,            // ✅ Registered
    HealthModule,            // ✅ Registered
    MtnModule,               // ✅ Registered
    BillingModule,           // ✅ Registered
    EmailModule,             // ✅ Registered
    DisbursementsModule,     // ✅ Registered
    MerchantConfigurationModule, // ✅ NEWLY REGISTERED
  ],
  providers: [
    StructuredLoggingService,
    RequestLoggingInterceptor,
    UsageTrackingInterceptor,
    TenantThrottlerGuard,
  ],
})
```

### Database Entities ✅

All entities registered in TypeOrmModuleOptions:
- ✅ Tenant
- ✅ User
- ✅ Payment
- ✅ Transaction
- ✅ Audit
- ✅ IdempotencyKey
- ✅ Disbursement
- ✅ WebhookLog
- ✅ BillingPlan
- ✅ TenantBillingSubscription
- ✅ UsageMetrics
- ✅ Invoice
- ✅ InvoiceLineItem
- ✅ **MerchantConfiguration** (NEWLY ADDED)

---

## Deployment Checklist

- [x] Module created and exported
- [x] Entity created and registered in TypeOrmModuleOptions
- [x] Service implemented with full business logic
- [x] Controller implemented with 7 endpoints
- [x] DTOs created for request/response validation
- [x] Module imported in AppModule
- [x] Database migration created
- [x] Documentation completed

**All endpoints are now exposed and ready to use!** 🚀

---

## Testing the Endpoints

### 1. Create Merchant Configuration
```bash
curl -X POST http://localhost:3000/api/v1/merchant/configuration \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: kangwa" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Test Business",
    "mtnCollectionSubscriptionKey": "key123",
    "mtnCollectionApiKey": "api123",
    "mtnCollectionXReferenceId": "ref001"
  }'
```

### 2. Get Configuration
```bash
curl -X GET http://localhost:3000/api/v1/merchant/configuration \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: kangwa"
```

### 3. Verify MTN
```bash
curl -X POST http://localhost:3000/api/v1/merchant/configuration/verify/mtn \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: kangwa"
```

### 4. Test Webhook
```bash
curl -X POST http://localhost:3000/api/v1/merchant/configuration/webhook/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Tenant-Id: kangwa" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "payment.success"
  }'
```

---

## Next Steps

1. **Run migrations:**
   ```bash
   npm run migration:run
   ```

2. **Test endpoints** using provided curl commands above

3. **Monitor logs** for any issues:
   ```bash
   npm run dev
   ```

4. **Integration:** Update MTN and Airtel services to use `merchantConfigService` instead of env variables

All endpoints are fully exposed and accessible! ✅
