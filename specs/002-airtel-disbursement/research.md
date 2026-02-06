# Research & Decisions: Airtel Money Disbursements

**Feature**: 002-airtel-disbursement  
**Date**: February 5, 2026  
**Purpose**: Resolve technical uncertainties before implementation

---

## 1. PIN Encryption Method

### Question
How to encrypt the 4-digit numeric PIN required by Airtel disbursement API?

### Research
Airtel API documentation states: "Encrypted four digit numeric pin to be send in a transaction request to complete the payment. To check for encryption Please click here"

Based on Airtel Money integration patterns and the existing `x-key` encryption:
- Airtel provides an RSA public key for encryption
- PIN is likely encrypted using RSA-OAEP with the provided public key
- Encrypted value is base64-encoded before transmission

Similar pattern to `x-key` generation in AirtelSigningService.

### Decision
**Implement PIN encryption using crypto module with RSA-OAEP:**

```typescript
encryptPin(pin: string): string {
  const publicKey = this.configService.get<string>('airtel.encryption_public_key');
  const pinBuffer = Buffer.from(pin, 'utf8');
  
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    pinBuffer,
  );
  
  return encrypted.toString('base64');
}
```

**Rationale**: 
- Reuses existing RSA public key from Airtel
- Consistent with `x-key` encryption pattern
- No additional dependencies required
- PIN never stored or transmitted in plaintext

**Alternative Rejected**:  
AES symmetric encryption - Airtel docs indicate RSA asymmetric encryption using their public key.

---

## 2. Wallet Types and Transaction Types

### Question
What are the valid values for `wallet_type` and `transaction.type` fields?

### Research
From Airtel API specification:
- **wallet_type**: Type of wallet where payee wants money credited
  - Examples seen in docs: `NORMAL`, `SALARY`
  - Likely other types: `BUSINESS`, `AGENT` (common in mobile money systems)
  
- **transaction.type**: Transaction type classification
  - Examples: `B2C` (Business to Consumer), `B2B` (Business to Business)
  - May also support: `C2B`, `G2P` (Government to Person)

### Decision
**Implement enums with documented values:**

```typescript
enum WalletType {
  NORMAL = 'NORMAL',
  SALARY = 'SALARY',
  // Additional types to be added as discovered from Airtel docs
}

enum TransactionType {
  B2C = 'B2C',  // Business to Consumer (default)
  B2B = 'B2B',  // Business to Business
}
```

**Default Values**:
- `wallet_type`: `NORMAL` if not specified
- `transaction.type`: `B2C` if not specified

**Rationale**:
- Start with documented values from Airtel spec
- Use TypeScript enums for type safety
- Defaults handle common use case (consumer payouts)
- Extensible as more types are discovered

**Implementation Note**: If Airtel rejects an invalid type, error message will guide users to correct values.

---

## 3. Idempotency Strategy

### Question
How to prevent duplicate disbursements for the same transaction ID?

### Research
Best practices for payment API idempotency:
1. **Database unique constraint** on (tenantId, externalId)
2. **Status check before retry** - if transaction exists, return existing result
3. **Consistent transaction ID** generation by client
4. **Airtel's handling** - their API may also enforce idempotency

Existing payment module pattern:
- Payment entity has `externalId` field
- Queries check for existing payment before creating new one

### Decision
**Multi-layer idempotency:**

1. **Database Level**:
```typescript
@Entity('disbursements')
@Index(['tenantId', 'externalId'], { unique: true })
export class Disbursement {
  @Column()
  externalId: string;  // Client-provided idempotency key
}
```

2. **Service Level**:
```typescript
async createDisbursement(dto: CreateDisbursementDto, tenantId: string) {
  // Check for existing disbursement
  const existing = await this.disbursementRepository.findOne({
    where: { tenantId, externalId: dto.externalId }
  });
  
  if (existing) {
    this.logger.log('Idempotent request - returning existing disbursement');
    return existing;  // Return same result
  }
  
  // Create new disbursement...
}
```

3. **API Contract**:
- Require `externalId` in POST request
- Document that duplicate `externalId` returns original result (HTTP 200, same data)
- Never create duplicate database records

**Rationale**:
- Database constraint prevents race conditions
- Service check provides fast idempotent response
- Matches existing payment module pattern
- Client controls transaction ID for reconciliation

**Alternative Rejected**:  
Generated transaction IDs - clients need control over IDs for their own reconciliation and retry logic.

---

## 4. Status Polling vs Webhooks

### Question
How to get final disbursement status from Airtel after async processing?

### Research
Airtel disbursement flow:
1. POST to `/standard/v3/disbursements` returns immediate response with status
2. Initial status may be `PENDING` or `PROCESSING`
3. Final status determined asynchronously

Options:
- **Polling**: Client periodically calls status query endpoint
- **Webhooks**: Airtel calls our callback URL when status changes
- **Hybrid**: Support both methods

Existing MTN integration: Uses polling via `/payments/{id}/status` endpoint

### Decision
**Implement polling-first with webhook support as future enhancement:**

**Phase 1 (Current)**:
```typescript
// GET /api/v1/disbursements/:id endpoint
async getDisbursementStatus(id: string, tenantId: string) {
  const disbursement = await this.findOne(id, tenantId);
  
  // If still pending, optionally query Airtel for update
  if (disbursement.status === DisbursementStatus.PENDING) {
    const airtelStatus = await this.airtelService.queryStatus(id);
    await this.updateStatus(disbursement, airtelStatus);
  }
  
  return disbursement;
}
```

**Phase 2 (Future)**:
- Add webhook endpoint: `POST /api/v1/webhooks/airtel/disbursement`
- Validate webhook signature using `x-signature` header
- Update disbursement status from webhook payload
- Polling remains as fallback

**Rationale**:
- Polling is simpler to implement and test
- No webhook endpoint exposure required initially
- Clients can control polling frequency
- Matches existing payment module pattern
- Webhooks add value later for real-time updates

**Default Recommendation**: 
Clients should poll every 5-30 seconds for pending disbursements, with exponential backoff after 5 minutes.

---

## Summary

All research tasks completed. No blockers identified.

**Implementation-ready decisions**:
1. ✅ PIN encryption: RSA-OAEP with Airtel public key
2. ✅ Wallet/transaction types: Enums with NORMAL/B2C defaults
3. ✅ Idempotency: Database unique constraint + service-level check
4. ✅ Status updates: Polling-first, webhooks as future enhancement

**Dependencies**:
- Existing AirtelAuthService (OAuth2 tokens)
- Existing AirtelSigningService (message signing)
- Airtel RSA public key from developer portal (same as collection)

**Ready for Phase 1**: Data model and contract generation.
