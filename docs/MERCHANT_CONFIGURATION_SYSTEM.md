# Merchant Configuration System

## Overview

The **Merchant Configuration System** is a dedicated per-tenant configuration management layer that stores all merchant-specific credentials, KYC information, and business details. This enables true multi-tenant credential isolation where each merchant maintains their own MTN and Airtel provider credentials.

## Problem Solved

**Before**: Credentials were stored at the application/deployment level in environment variables, requiring a single set of credentials per deployment instance.

**After**: Each merchant (tenant) can configure their own:
- ✅ MTN API credentials (collection & disbursement)
- ✅ Airtel OAuth2 credentials
- ✅ Bank account details for settlements
- ✅ KYC/compliance information
- ✅ Webhook configuration
- ✅ Rate limits and transaction thresholds

## Architecture

### Entity: `MerchantConfiguration`

Stored in `merchant_configurations` table with the following sections:

#### 1. Business Information
```typescript
businessName: string                    // Legal business name
businessRegistrationNumber: string      // Registration number
taxId: string                          // Tax/VAT ID
businessCategory: string               // Industry classification
websiteUrl: string                     // Business website
businessAddress: string                // Physical address (encrypted)
contactPersonName: string              // Primary contact
contactPersonPhone: string             // Contact phone
contactPersonEmail: string             // Contact email
```

#### 2. MTN Credentials (Encrypted)
```typescript
mtnCollectionSubscriptionKey: string    // API subscription key
mtnCollectionApiKey: string            // API key
mtnCollectionXReferenceId: string      // Unique merchant reference
mtnCollectionTargetEnvironment: string // 'sandbox' | 'production'

mtnDisbursementSubscriptionKey: string  // For payouts
mtnDisbursementApiKey: string          // For payouts
mtnDisbursementXReferenceId: string    // For payouts
mtnDisbursementTargetEnvironment: string

mtnAccountActive: boolean              // Activation status
mtnLastVerified: Date                  // Last verification date
```

#### 3. Airtel Credentials (Encrypted)
```typescript
airtelClientId: string                 // OAuth2 Client ID
airtelClientSecret: string             // OAuth2 Client Secret
airtelSigningSecret: string            // HMAC signing key
airtelEncryptionPublicKey: string      // RSA public key
airtelEnvironment: string              // 'staging' | 'production'
airtelCountry: string                  // Country code (e.g., 'ZM')
airtelCurrency: string                 // Default currency (e.g., 'ZMW')
airtelMerchantId: string               // Merchant account ID
airtelAccountActive: boolean           // Activation status
airtelLastVerified: Date               // Last verification date
```

#### 4. Bank Account Information (Encrypted)
```typescript
bankAccountHolder: string              // Account holder name
bankAccountNumber: string              // Account number
bankAccountType: string                // 'checking' | 'savings' | 'business'
bankName: string                       // Bank name
bankBranchCode: string                 // Branch code
bankSwiftCode: string                  // SWIFT/BIC code
bankAccountCurrency: string            // Account currency
bankAccountVerified: boolean           // Verification status
bankAccountVerifiedDate: Date          // Verification date
```

#### 5. KYC & Compliance Information
```typescript
kycStatus: KycStatus                   // 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NEEDS_UPDATE'
kycSubmittedDate: Date                 // When KYC was submitted
kycVerifiedDate: Date                  // When KYC was approved
kycRejectionReason: string             // If rejected

directorName: string                   // Director/Owner name
directorIdNumber: string               // ID number (encrypted)
directorIdType: string                 // 'passport' | 'national_id' | 'driver_license'
beneficialOwnerInfo: string            // Beneficial owner details (encrypted)
complianceNotes: string                // Compliance notes
```

#### 6. Webhook Configuration
```typescript
webhookUrl: string                     // Webhook endpoint URL
webhookSecret: string                  // Signature key (encrypted)
webhookEvents: string[]                // Events to subscribe to
webhookEnabled: boolean                // Enable/disable webhooks
webhookLastTested: Date                // Last test date
```

#### 7. Rate Limits & Configuration
```typescript
maxDailyCollections: number            // Max daily requests (default: 10,000)
maxDailyDisbursementAmount: decimal    // Max daily payout amount
maxTransactionAmount: decimal          // Single transaction limit
approvalThresholdAmount: decimal       // Amount requiring approval
```

## API Endpoints

### 1. Create Configuration
```bash
POST /api/v1/merchant/configuration
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}

{
  "businessName": "Acme Corporation Ltd",
  "businessRegistrationNumber": "BRN-123456",
  "businessCategory": "E-Commerce",
  "websiteUrl": "https://acme.com",
  "contactPersonName": "John Doe",
  "contactPersonEmail": "contact@acme.com",
  "mtnCollectionSubscriptionKey": "...",
  "mtnCollectionApiKey": "...",
  "airtelClientId": "...",
  "airtelClientSecret": "...",
  "bankAccountHolder": "Acme Corporation",
  "bankAccountNumber": "1234567890",
  "bankName": "Zambia National Bank",
  "directorName": "John Doe",
  "directorIdNumber": "ZM12345",
  "webhookUrl": "https://acme.com/webhooks/payments",
  "maxDailyCollections": 10000,
  "maxTransactionAmount": 50000
}
```

**Response** (sensitive fields redacted):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "kangwa",
  "businessName": "Acme Corporation Ltd",
  "businessRegistrationNumber": "BRN-123456",
  "businessCategory": "E-Commerce",
  "mtnAccountActive": false,
  "airtelAccountActive": false,
  "bankAccountVerified": false,
  "kycStatus": "PENDING",
  "webhookEnabled": true,
  "encryptionStatus": "ENCRYPTED",
  "maxDailyCollections": 10000,
  "isActive": true,
  "createdAt": "2026-02-06T17:00:00.000Z",
  "updatedAt": "2026-02-06T17:00:00.000Z"
}
```

### 2. Get Configuration
```bash
GET /api/v1/merchant/configuration
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### 3. Update Configuration
```bash
PATCH /api/v1/merchant/configuration
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}

{
  "businessName": "Updated Company Name",
  "maxTransactionAmount": 75000
}
```

### 4. Verify MTN Credentials
```bash
POST /api/v1/merchant/configuration/verify/mtn
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

**Response**:
```json
{
  "success": true,
  "message": "MTN credentials verified successfully"
}
```

### 5. Verify Airtel Credentials
```bash
POST /api/v1/merchant/configuration/verify/airtel
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### 6. Verify Bank Account
```bash
POST /api/v1/merchant/configuration/verify/bank
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}
```

### 7. Test Webhook
```bash
POST /api/v1/merchant/configuration/webhook/test
Authorization: Bearer {token}
X-Tenant-Id: {tenantId}

{
  "eventType": "payment.success"
}
```

## Security Features

### 1. Encryption at Rest
- Sensitive fields automatically encrypted before storage:
  - All credential keys
  - Bank account numbers
  - Personal ID numbers
  - Webhook secrets
  - Business addresses

- Uses configurable encryption key (from `ENCRYPTION_KEY` env var)
- Supports key rotation with `encryptionKeyVersion` tracking

### 2. Encryption in Transit
- All endpoints require HTTPS
- Bearer token authentication required
- Multi-tenant isolation enforced via `X-Tenant-Id` header

### 3. Response Data Masking
- API responses never include:
  - API keys or secrets
  - Bank account numbers (except bank name)
  - Personal ID numbers
  - Encrypted fields
- Instead shows:
  - Verification status (active/verified/pending)
  - Last verification date
  - Overall encryption status

### 4. Audit Trail
- `lastUpdatedBy`: User ID who made the change
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `deletedAt`: Soft deletion timestamp

## Integration with Payment System

### Using MTN Credentials
```typescript
// In MtnService or DisbursementService
const mtnConfig = await merchantConfigService.getMtnCredentials(tenantId);

const headers = {
  'Ocp-Apim-Subscription-Key': mtnConfig.collectionSubscriptionKey,
  'X-Reference-Id': mtnConfig.collectionXReferenceId,
};
```

### Using Airtel Credentials
```typescript
// In AirtelCollectionService
const airtelConfig = await merchantConfigService.getAirtelCredentials(tenantId);

const authResponse = await axios.post(authUrl, {
  client_id: airtelConfig.clientId,
  client_secret: airtelConfig.clientSecret,
  grant_type: 'client_credentials',
});
```

### Using Bank Details
```typescript
// In SettlementsService (future)
const bankDetails = await merchantConfigService.getBankAccountDetails(tenantId);

// Transfer funds to merchant's bank account
await settlementService.initiateTransfer(
  tenantId,
  bankDetails.accountNumber,
  bankDetails.bankName,
  amount,
);
```

## KYC Workflow

### States
```
PENDING (initial)
  ↓
VERIFIED (after successful KYC check)
  ↓ (if information changes)
NEEDS_UPDATE (when update required)
  ↓
VERIFIED (after re-verification)

OR

PENDING
  ↓
REJECTED (if KYC fails)
  ↓ (after fixing issues)
PENDING (resubmit)
```

### KYC Verification Steps
1. Collect business information
2. Verify business registration
3. Collect director/owner details
4. Verify personal identification
5. Check for compliance issues
6. Mark as VERIFIED or REJECTED

## Migration Guide

### For Existing Tenants

1. Create initial merchant configuration:
```bash
POST /api/v1/merchant/configuration
{
  "businessName": "...",
  "mtnCollectionSubscriptionKey": "...",
  "airtelClientId": "...",
  // ... other fields
}
```

2. Verify credentials:
```bash
POST /api/v1/merchant/configuration/verify/mtn
POST /api/v1/merchant/configuration/verify/airtel
```

3. Update services to use tenant-specific credentials instead of env vars

### Code Migration Example

**Before** (environment-based):
```typescript
@Injectable()
export class MtnService {
  private mtnApiKey = this.configService.get('MTN_COLLECTION_API_KEY');
  
  async requestToPay(dto) {
    // Uses single global credential
  }
}
```

**After** (merchant-configuration-based):
```typescript
@Injectable()
export class MtnService {
  constructor(
    private merchantConfigService: MerchantConfigurationService,
  ) {}
  
  async requestToPay(dto, tenantId: string) {
    const config = await this.merchantConfigService.getMtnCredentials(tenantId);
    const headers = {
      'Ocp-Apim-Subscription-Key': config.collectionSubscriptionKey,
      'X-Reference-Id': config.collectionXReferenceId,
    };
    // Uses tenant-specific credential
  }
}
```

## Database Schema

```sql
CREATE TABLE merchant_configurations (
  id UUID PRIMARY KEY,
  tenantId VARCHAR(255) NOT NULL UNIQUE,
  
  -- Business Info
  businessName VARCHAR(255) NOT NULL,
  businessRegistrationNumber VARCHAR(100),
  taxId VARCHAR(100),
  businessCategory VARCHAR(100),
  websiteUrl VARCHAR(500),
  businessAddress TEXT,
  contactPersonName VARCHAR(255),
  contactPersonPhone VARCHAR(20),
  contactPersonEmail VARCHAR(255),
  
  -- MTN Credentials (encrypted)
  mtnCollectionSubscriptionKey TEXT,
  mtnCollectionApiKey TEXT,
  mtnCollectionXReferenceId VARCHAR(255),
  mtnCollectionTargetEnvironment VARCHAR(50) DEFAULT 'sandbox',
  mtnDisbursementSubscriptionKey TEXT,
  mtnDisbursementApiKey TEXT,
  mtnDisbursementXReferenceId VARCHAR(255),
  mtnDisbursementTargetEnvironment VARCHAR(50) DEFAULT 'sandbox',
  mtnAccountHolder VARCHAR(255),
  mtnAccountActive BOOLEAN DEFAULT false,
  mtnLastVerified TIMESTAMP,
  
  -- Airtel Credentials (encrypted)
  airtelClientId TEXT,
  airtelClientSecret TEXT,
  airtelSigningSecret TEXT,
  airtelEncryptionPublicKey TEXT,
  airtelEnvironment VARCHAR(50) DEFAULT 'staging',
  airtelCountry VARCHAR(2) DEFAULT 'ZM',
  airtelCurrency VARCHAR(3) DEFAULT 'ZMW',
  airtelMerchantId VARCHAR(255),
  airtelAccountActive BOOLEAN DEFAULT false,
  airtelLastVerified TIMESTAMP,
  
  -- Bank Account (encrypted)
  bankAccountHolder VARCHAR(255),
  bankAccountNumber TEXT,
  bankAccountType VARCHAR(50),
  bankName VARCHAR(255),
  bankBranchCode VARCHAR(100),
  bankSwiftCode VARCHAR(50),
  bankAccountCurrency VARCHAR(3) DEFAULT 'ZMW',
  bankAccountVerified BOOLEAN DEFAULT false,
  bankAccountVerifiedDate TIMESTAMP,
  
  -- KYC
  kycStatus ENUM('PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_UPDATE') DEFAULT 'PENDING',
  kycSubmittedDate TIMESTAMP,
  kycVerifiedDate TIMESTAMP,
  kycRejectionReason TEXT,
  directorName VARCHAR(255),
  directorIdNumber TEXT,
  directorIdType VARCHAR(50),
  beneficialOwnerInfo TEXT,
  complianceNotes TEXT,
  
  -- Webhooks
  webhookUrl VARCHAR(500),
  webhookSecret TEXT,
  webhookEvents JSONB DEFAULT '[]',
  webhookEnabled BOOLEAN DEFAULT true,
  webhookLastTested TIMESTAMP,
  
  -- Encryption
  encryptionStatus ENUM('ENCRYPTED', 'UNENCRYPTED', 'NEEDS_ROTATION') DEFAULT 'UNENCRYPTED',
  encryptionKeyVersion INT DEFAULT 1,
  credentialsRotatedDate TIMESTAMP,
  
  -- Rate Limits
  maxDailyCollections INT DEFAULT 10000,
  maxDailyDisbursementAmount DECIMAL(19,2),
  maxTransactionAmount DECIMAL(19,2),
  approvalThresholdAmount DECIMAL(19,2),
  
  -- Audit
  notes TEXT,
  isActive BOOLEAN DEFAULT true,
  lastUpdatedBy VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP
);

CREATE INDEX IDX_merchant_config_tenantId ON merchant_configurations(tenantId);
CREATE INDEX IDX_merchant_config_kycStatus ON merchant_configurations(kycStatus);
CREATE INDEX IDX_merchant_config_createdAt ON merchant_configurations(createdAt);
CREATE INDEX IDX_merchant_config_isActive ON merchant_configurations(isActive);
```

## Future Enhancements

1. **Credential Rotation**
   - Scheduled automatic credential rotation
   - Version management for keys
   - Graceful transition between old/new credentials

2. **Per-Provider Rate Limits**
   - MTN-specific rate limits
   - Airtel-specific rate limits
   - Time-based quotas

3. **Advanced KYC**
   - Document upload and verification
   - Integration with KYC providers
   - Automated compliance checks

4. **Webhook Management**
   - Retry logic for failed webhooks
   - Webhook event filtering
   - Signature verification improvements

5. **Settlement Integration**
   - Automatic fund settlement to bank account
   - Settlement history and reconciliation
   - Multi-account support per merchant

## Configuration Examples

### Minimal Configuration (Collection Only)
```json
{
  "businessName": "My Business",
  "mtnCollectionSubscriptionKey": "...",
  "mtnCollectionApiKey": "...",
  "mtnCollectionXReferenceId": "merchant-ref-001"
}
```

### Full Configuration (Collection + Disbursement)
```json
{
  "businessName": "Full Service Business",
  "businessRegistrationNumber": "BRN-123456",
  "taxId": "TAX-ZM-789",
  "businessCategory": "E-Commerce",
  "mtnCollectionSubscriptionKey": "...",
  "mtnCollectionApiKey": "...",
  "mtnCollectionXReferenceId": "mtn-collection-ref",
  "mtnDisbursementSubscriptionKey": "...",
  "mtnDisbursementApiKey": "...",
  "mtnDisbursementXReferenceId": "mtn-disbursement-ref",
  "airtelClientId": "...",
  "airtelClientSecret": "...",
  "airtelSigningSecret": "...",
  "airtelEncryptionPublicKey": "...",
  "bankAccountHolder": "Business Name",
  "bankAccountNumber": "1234567890",
  "bankName": "Primary Bank",
  "bankSwiftCode": "BANKZMLU",
  "directorName": "Owner Name",
  "directorIdNumber": "ID12345",
  "webhookUrl": "https://business.com/webhooks",
  "webhookSecret": "...",
  "maxDailyCollections": 50000,
  "maxDailyDisbursementAmount": 100000,
  "maxTransactionAmount": 100000,
  "approvalThresholdAmount": 50000
}
```

## Testing

### Unit Tests
```typescript
describe('MerchantConfigurationService', () => {
  it('should create merchant configuration', async () => {
    const result = await service.create(tenantId, dto);
    expect(result.businessName).toBe(dto.businessName);
    expect(result.kycStatus).toBe('PENDING');
  });

  it('should verify MTN credentials', async () => {
    const result = await service.verifyMtnCredentials(tenantId);
    expect(result.success).toBe(true);
  });

  it('should not expose sensitive fields in response', async () => {
    const result = await service.findByTenantId(tenantId);
    expect(result.mtnCollectionApiKey).toBeUndefined();
    expect(result.bankAccountNumber).toBeUndefined();
  });
});
```

### Integration Tests
```typescript
describe('Merchant Configuration API', () => {
  it('POST /api/v1/merchant/configuration should create config', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/merchant/configuration')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .send(createDto)
      .expect(201);

    expect(response.body.id).toBeDefined();
  });

  it('GET /api/v1/merchant/configuration should return config without secrets', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/merchant/configuration')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Id', tenantId)
      .expect(200);

    expect(response.body.businessName).toBeDefined();
    expect(response.body.mtnCollectionApiKey).toBeUndefined();
  });
});
```

## Summary

The **Merchant Configuration System** provides:

✅ **Per-tenant credential isolation** - Each merchant manages their own credentials  
✅ **Multi-provider support** - MTN, Airtel, and future providers  
✅ **Secure credential storage** - Encrypted at rest and in transit  
✅ **KYC workflow** - Built-in compliance tracking  
✅ **Webhook management** - Per-merchant webhook configuration  
✅ **Rate limiting** - Customizable per-merchant limits  
✅ **Audit trail** - Complete change tracking  
✅ **Easy verification** - Test connectivity with providers  

This enables truly SaaS-ready multi-tenant payment gateway operations where merchants retain control over their credentials and configuration.
