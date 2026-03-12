# Component Responsibility Map: What Currently Handles Disbursements

## Quick Reference: Who Does What

### Disbursement Creation Flow - Responsibility Assignment

```
Step                              Component              Table/Entity       File
─────────────────────────────────────────────────────────────────────────────────
1. Receive POST request          Controller            N/A               disbursements.controller.ts
2. Validate input               Controller            N/A               (via ValidationPipe)
3. Extract tenantId             Controller            N/A               (via CurrentTenant decorator)
4. Validate amount > 0          Service               N/A               disbursements.service.ts
5. Normalize MSISDN             Service               N/A               disbursements.service.ts
6. Check for duplicates         Service               disbursements     disbursements.service.ts
7. Encrypt PIN                  AirtelSigningService  N/A               airtel-signing.service.ts
8. Create PENDING record        Service + Repository  disbursements     disbursements.service.ts
9. Call Airtel API              AirtelDisbursement    N/A               airtel-disbursement.service.ts
10. Handle Airtel response      Service               disbursements     disbursements.service.ts
11. Update status (S/F)         Service + Repository  disbursements     disbursements.service.ts
12. Log change                  AuditSubscriber       audit_log*        (automatic)
13. Return response             Controller            disbursements     disbursements.controller.ts
```

---

## Component Breakdown

### 1. DisbursementsController
**File**: `src/modules/disbursements/controllers/disbursements.controller.ts`

**Responsibilities**:
- ✅ Accept HTTP requests (POST /api/v1/disbursements)
- ✅ Validate API key authentication
- ✅ Validate request body (DTO validation)
- ✅ Extract tenantId from API key
- ✅ Call DisbursementsService
- ✅ Return HTTP responses (201/400/401/409)
- ✅ Document API via Swagger

**Does NOT do**:
- ❌ Access database directly
- ❌ Encrypt PIN
- ❌ Call Airtel API
- ❌ Do business logic

**Code Example**:
```typescript
@Post()
@ApiOperation({ summary: 'Create disbursement' })
async createDisbursement(
  @Body() createDto: CreateDisbursementDto,
  @CurrentTenant() tenantId: string,
) {
  return await this.disbursementsService.createDisbursement(
    createDto,
    tenantId
  );
}
```

---

### 2. DisbursementsService
**File**: `src/modules/disbursements/services/disbursements.service.ts`

**Responsibilities**:
- ✅ Validate business logic (amount > 0, PIN format, etc)
- ✅ Normalize MSISDN format
- ✅ Check idempotency (findByExternalId)
- ✅ Orchestrate PIN encryption
- ✅ Create initial PENDING record
- ✅ Orchestrate Airtel API call
- ✅ Map Airtel response to application model
- ✅ Update disbursement status
- ✅ Enforce multi-tenant isolation
- ✅ Extract and map error codes
- ✅ Provide query methods (getDisbursement, listDisbursements, countByStatus)

**Does NOT do**:
- ❌ HTTP request handling
- ❌ PIN encryption (delegates to AirtelSigningService)
- ❌ Airtel API calls (delegates to AirtelDisbursementService)
- ❌ Database queries directly (uses repository)

**Code Example - Core Workflow**:
```typescript
async createDisbursement(
  createDto: CreateDisbursementDto,
  tenantId: string,
): Promise<DisbursementResponseDto> {
  // 1. Validate
  this.validateDisbursementRequest(createDto);

  // 2. Normalize MSISDN
  const normalizedMsisdn = this.normalizeMsisdn(createDto.payeeMsisdn);

  // 3. Check idempotency
  const existing = await this.disbursementRepository.findByExternalId(
    tenantId,
    createDto.externalId,
  );
  if (existing) return this.mapToResponseDto(existing);

  // 4. Encrypt PIN
  const encryptedPin = this.airtelSigningService.encryptPin(createDto.pin);

  // 5. Create PENDING record
  let disbursement = this.disbursementRepository.create({
    tenantId,
    externalId: createDto.externalId,
    payeeMsisdn: normalizedMsisdn,
    amount: createDto.amount.toString(),
    currency: createDto.currency,
    reference: createDto.reference,
    encryptedPin,
    walletType: createDto.walletType,
    transactionType: createDto.transactionType,
    status: DisbursementStatus.PENDING,
  });
  disbursement = await this.disbursementRepository.save(disbursement);

  // 6. Call Airtel API
  try {
    const airtelRequest = new AirtelDisbursementRequestDto({
      // ...populate from createDto
    });
    const airtelResponse = await this.airtelDisbursementService
      .createDisbursement(airtelRequest);

    // 7. Update to SUCCESS
    disbursement.status = DisbursementStatus.SUCCESS;
    disbursement.airtelReferenceId = airtelResponse.data.transaction.id;
    // ...
  } catch (error) {
    // 8. Update to FAILED
    disbursement.status = DisbursementStatus.FAILED;
    disbursement.errorCode = this.getErrorCode(error);
    disbursement.errorMessage = this.getErrorMessage(error);
  }

  // 9. Save final state
  disbursement = await this.disbursementRepository.save(disbursement);

  // 10. Return response
  return this.mapToResponseDto(disbursement);
}
```

---

### 3. DisbursementRepository
**File**: `src/modules/disbursements/repositories/disbursement.repository.ts`

**Responsibilities**:
- ✅ Abstract database access patterns
- ✅ Implement custom query methods
- ✅ Enforce tenant isolation in queries
- ✅ Provide: findByExternalId, findByIdForTenant, listByTenant, countByStatus, etc.
- ✅ Ensure all queries filter by tenantId

**Does NOT do**:
- ❌ Business logic
- ❌ External API calls
- ❌ HTTP handling

**Query Methods Provided**:
```typescript
findByExternalId(tenantId: string, externalId: string): Promise<Disbursement | null>
findByIdForTenant(id: string, tenantId: string): Promise<Disbursement | null>
listByTenant(tenantId: string, query: ListQuery): Promise<[Disbursement[], number]>
countByStatus(tenantId: string, status: DisbursementStatus): Promise<number>
findPendingByTenant(tenantId: string): Promise<Disbursement[]>
```

---

### 4. AirtelDisbursementService
**File**: `src/modules/airtel/disbursement/airtel-disbursement.service.ts`

**Responsibilities**:
- ✅ Make HTTP requests to Airtel API
- ✅ Handle OAuth2 authentication (get bearer token)
- ✅ Generate request signatures (HMAC-SHA256)
- ✅ Generate encrypted keys
- ✅ Map HTTP responses to DTOs
- ✅ Extract Airtel transaction IDs from responses
- ✅ Handle Airtel-specific errors

**Does NOT do**:
- ❌ Store data in database
- ❌ HTTP request serving
- ❌ Business logic validation
- ❌ PIN encryption (delegates to AirtelSigningService)

**Methods**:
```typescript
async createDisbursement(request: AirtelDisbursementRequestDto)
  // POST to /standard/v3/disbursements with OAuth token + signature

async queryDisbursementStatus(transactionId: string)
  // GET status of existing disbursement

async refundDisbursement(request: AirtelRefundRequestDto)
  // POST refund request to Airtel
```

---

### 5. AirtelSigningService
**File**: `src/modules/airtel/signing/airtel-signing.service.ts`

**Responsibilities**:
- ✅ Encrypt PIN using RSA-OAEP (2048-bit key)
- ✅ Generate HMAC-SHA256 message signatures
- ✅ Generate encrypted encryption keys
- ✅ Provide cryptographic operations required by Airtel API

**Does NOT do**:
- ❌ HTTP calls
- ❌ Database operations
- ❌ Business logic

**Methods**:
```typescript
encryptPin(pin: string): string
  // RSA-OAEP encryption of 4-digit PIN
  // Returns base64-encoded encrypted data

generateSignature(message: string): string
  // HMAC-SHA256 signature for message integrity

generateEncryptedKey(key: string): string
  // AES key encryption for Airtel
```

---

### 6. Disbursement Entity
**File**: `src/modules/disbursements/entities/disbursement.entity.ts`

**Responsibilities**:
- ✅ Define database schema
- ✅ Provide TypeORM decorators
- ✅ Document column purposes
- ✅ Enforce constraints (unique, check, indexes)

**Table Structure**:
```
disbursements (
  id: UUID [PK],
  tenantId: string [INDEX],
  externalId: string [UNIQUE with tenantId],
  payeeMsisdn: string [INDEX],
  amount: decimal [CHECK > 0],
  currency: varchar,
  reference: varchar,
  encryptedPin: text,
  walletType: enum,
  transactionType: enum,
  status: enum [INDEX],
  airtelReferenceId: varchar,
  airtelMoneyId: varchar,
  errorCode: varchar,
  errorMessage: text,
  createdAt: timestamp [INDEX],
  updatedAt: timestamp
)
```

**Indexes**:
- tenantId (for filtering by tenant)
- (tenantId, externalId) unique (for idempotency)
- status (for filtering by status)
- createdAt (for date range queries)
- payeeMsisdn (for querying by recipient)

---

### 7. AuditSubscriber
**File**: `src/common/database/subscribers/audit.subscriber.ts`

**Responsibilities**:
- ✅ Automatically log entity changes
- ✅ Record who changed what and when
- ✅ Store before/after values
- ✅ Create audit trail for compliance

**How It Works**:
```
Disbursement Entity Changes
        │
        ▼
AuditSubscriber (event-based)
├─ INSERT: Create audit log entry
│  ├─ action: 'INSERT'
│  ├─ entityId: disbursement.id
│  ├─ changes: {all fields}
│  ├─ timestamp: now()
│  └─ user: currentUser
├─ UPDATE: Create audit log entry
│  ├─ action: 'UPDATE'
│  ├─ entityId: disbursement.id
│  ├─ changes: {only changed fields}
│  ├─ timestamp: now()
│  └─ user: currentUser
└─ DELETE: Create audit log entry
   ├─ action: 'DELETE'
   ├─ entityId: disbursement.id
   ├─ changes: {all fields}
   ├─ timestamp: now()
   └─ user: currentUser
```

**Does NOT do**:
- ❌ Business logic
- ❌ Call Airtel API
- ❌ HTTP handling

---

## Data Flow with Component Assignments

```
Client Request
     │
     ▼
┌─────────────────────────────────────────┐
│ DisbursementsController                 │
│ ✅ Validate API key                     │
│ ✅ Validate DTO (CreateDisbursementDto) │
│ ✅ Extract tenantId                     │
│ ✅ Call service                         │
└──────────┬────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ DisbursementsService                    │
│ ✅ Validate business rules              │
│ ✅ Normalize MSISDN                     │
│ ✅ Check idempotency                    │
│ ✅ Create PENDING record                │
└──────────┬────────────────────────────┘
           │
      ┌────┴─────────────┐
      │                  │
      ▼                  ▼
 ┌─────────────┐  ┌────────────────────┐
 │ AirtelSigning│  │ DisbursementRepo   │
 │Service       │  │ ✅ Save PENDING    │
 │ ✅ Encrypt   │  └────────────────────┘
 │   PIN        │         │
 └──────────────┘         ▼
                     ┌──────────────┐
                     │ disbursements│
                     │ Table (PEND) │
                     └──────────────┘
      │
      ▼
 ┌──────────────────────┐
 │ AirtelDisbursement   │
 │Service               │
 │ ✅ OAuth2 token      │
 │ ✅ Sign request      │
 │ ✅ POST to Airtel    │
 │ ✅ Parse response    │
 └──────┬───────────────┘
        │
        ▼
    [Airtel API]
        │
        ▼ (response: success/failure)
        │
        ▼
┌──────────────────────────────────┐
│ DisbursementsService             │
│ ✅ Update status (SUCCESS/FAILED)│
│ ✅ Save Airtel ref IDs           │
│ ✅ Record error if failed        │
└──────────┬──────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│ DisbursementRepository           │
│ ✅ Update disbursement record    │
└──────────┬──────────────────────┘
           │
           ▼
      ┌──────────────┐
      │ disbursements│
      │ Table (S/F)  │
      └──────┬───────┘
             │
             ▼
      ┌──────────────────┐
      │ AuditSubscriber  │
      │ ✅ Log change    │
      │    (automatic)   │
      └──────┬───────────┘
             │
             ▼
      ┌──────────────┐
      │ audit_logs   │
      │ (record)     │
      └──────────────┘
           │
           ▼
  [Response sent to client]
```

---

## Database Tables Involved

| Table | Purpose | Who Creates/Updates |
|-------|---------|-------------------|
| `disbursements` | Transaction record | DisbursementsService (via Repository) |
| `audit_logs` | Change history | AuditSubscriber (automatic) |
| (Airtel external) | Recipient wallet | Airtel system (not us) |

**Notably Absent**:
- ❌ No `journals` table
- ❌ No `journal_lines` table
- ❌ No `wallets` table (Airtel manages this externally)

---

## Test Coverage by Component

| Component | Test File | Test Count |
|-----------|-----------|------------|
| DisbursementsService | disbursements.service.spec.ts | 20+ |
| DisbursementsController | disbursements.controller.spec.ts | 20+ |
| AirtelDisbursementService | airtel-disbursement.service.spec.ts | 13+ |
| AirtelSigningService | airtel-signing-pin.spec.ts | 8+ |
| **Total** | | **60+** |

---

## Dependency Injection Chain

```
app.module.ts
├─ DisbursementsModule
│  ├─ Provides: DisbursementsService
│  ├─ Provides: DisbursementRepository
│  ├─ Imports: AirtelModule
│  └─ Injects:
│     ├─ DisbursementsService (DisbursementRepository)
│     ├─ DisbursementsService (AirtelDisbursementService)
│     ├─ DisbursementsService (AirtelSigningService)
│     ├─ DisbursementsService (StructuredLoggingService)
│     ├─ DisbursementsController (DisbursementsService)
│     └─ DisbursementRepository (TypeORM)
│
├─ AirtelModule
│  ├─ Provides: AirtelDisbursementService
│  ├─ Provides: AirtelSigningService
│  ├─ Provides: AirtelAuthService
│  └─ Injects:
│     ├─ AirtelDisbursementService (HttpModule)
│     ├─ AirtelDisbursementService (AirtelAuthService)
│     ├─ AirtelDisbursementService (ConfigService)
│     └─ AirtelSigningService (ConfigService)
│
└─ AuthModule
   └─ Provides: ApiKeyGuard, CurrentTenant decorator
```

---

## Summary: What Each Component Does

| Component | Analogy | Responsibility | File |
|-----------|---------|-----------------|------|
| **Controller** | Receptionist | Takes requests, validates, routes to service | controller.ts |
| **Service** | Manager | Orchestrates business logic, coordinates components | service.ts |
| **Repository** | Librarian | Stores/retrieves records from database | repository.ts |
| **Entity** | Blueprint | Defines database table structure | entity.ts |
| **AirtelDisbursement** | Courier | Sends requests to external Airtel API | airtel-disbursement.service.ts |
| **AirtelSigning** | Cryptographer | Encrypts/signs sensitive data | airtel-signing.service.ts |
| **Audit Subscriber** | Recorder | Automatically logs all changes | audit.subscriber.ts |
| **Database** | Filing cabinet | Stores disbursement records | disbursements table |

**No journals, no wallet tables - just clean, focused responsibilities.**
