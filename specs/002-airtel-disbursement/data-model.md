# Data Model: Airtel Money Disbursements

**Feature**: 002-airtel-disbursement  
**Date**: February 5, 2026  
**Purpose**: Define database schema and entity relationships

---

## Entities

### Disbursement

**Purpose**: Tracks payout transactions from business to customer Airtel Money wallets.

**Table Name**: `disbursements`

**Schema**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique disbursement identifier |
| tenantId | VARCHAR(255) | NOT NULL, INDEXED | Tenant owning this disbursement (multi-tenancy isolation) |
| externalId | VARCHAR(255) | NOT NULL | Client-provided idempotency key/transaction reference |
| payeeMsisdn | VARCHAR(20) | NOT NULL | Recipient's mobile number (without country code) |
| walletType | VARCHAR(50) | NOT NULL, DEFAULT 'NORMAL' | Wallet type: NORMAL, SALARY, etc. |
| amount | DECIMAL(19,4) | NOT NULL, CHECK (amount > 0) | Disbursement amount |
| currency | VARCHAR(3) | NOT NULL, DEFAULT 'ZMW' | Currency code (ISO 4217) |
| reference | VARCHAR(255) | NOT NULL | Business reference for this disbursement |
| encryptedPin | TEXT | NOT NULL | RSA-encrypted 4-digit PIN (base64) |
| transactionType | VARCHAR(10) | NOT NULL, DEFAULT 'B2C' | Transaction type: B2C, B2B |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING' | Current status (see DisbursementStatus enum) |
| airtelReferenceId | VARCHAR(255) | NULLABLE | Airtel-generated reference ID |
| airtelMoneyId | VARCHAR(255) | NULLABLE | Airtel Money transaction ID |
| errorCode | VARCHAR(50) | NULLABLE | Error code if disbursement failed |
| errorMessage | TEXT | NULLABLE | Human-readable error message |
| createdAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| updatedAt | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `PRIMARY KEY (id)`
- `INDEX idx_disbursement_tenant (tenantId)`
- `UNIQUE INDEX idx_disbursement_external (tenantId, externalId)` - Idempotency constraint
- `INDEX idx_disbursement_status (status)` - For filtering by status
- `INDEX idx_disbursement_created (createdAt DESC)` - For time-based queries
- `INDEX idx_disbursement_payee (payeeMsisdn)` - For payee lookups

**Relationships**:
- Belongs to: `Tenant` (via tenantId)
- Referenced by: `Audit` logs (via auditableType='Disbursement', auditableId=id)

**Validation Rules**:
- `amount` must be positive
- `payeeMsisdn` must not include country code prefix
- `externalId` unique per tenant (enforced by database constraint)
- `status` must be valid DisbursementStatus value
- `walletType` must be valid WalletType value
- `transactionType` must be valid TransactionType value

---

### DisbursementStatus (Enum)

**Purpose**: Defines valid disbursement lifecycle states.

**Values**:
- `PENDING` - Initial state, awaiting Airtel processing
- `PROCESSING` - Airtel is processing the disbursement
- `SUCCESS` - Disbursement completed successfully, money credited
- `FAILED` - Disbursement failed (see errorCode/errorMessage)

**State Transitions**:
```
PENDING → PROCESSING → SUCCESS
              ↓
           FAILED
```

**Implementation**: TypeScript enum + database CHECK constraint

---

### WalletType (Enum)

**Purpose**: Specifies recipient wallet type for routing.

**Values**:
- `NORMAL` - Standard consumer wallet (default)
- `SALARY` - Salary/payroll wallet
- Additional types as documented by Airtel

**Implementation**: TypeScript enum with validation

---

### TransactionType (Enum)

**Purpose**: Classifies disbursement transaction type.

**Values**:
- `B2C` - Business to Consumer (default)
- `B2B` - Business to Business

**Implementation**: TypeScript enum with validation

---

## TypeORM Entity Example

```typescript
import { Entity, Column, PrimaryGeneratedColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum DisbursementStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum WalletType {
  NORMAL = 'NORMAL',
  SALARY = 'SALARY',
}

export enum TransactionType {
  B2C = 'B2C',
  B2B = 'B2B',
}

@Entity('disbursements')
@Index(['tenantId'])
@Index(['tenantId', 'externalId'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
export class Disbursement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  tenantId: string;

  @Column({ nullable: false })
  externalId: string;

  @Column({ nullable: false, length: 20 })
  payeeMsisdn: string;

  @Column({
    type: 'enum',
    enum: WalletType,
    default: WalletType.NORMAL,
  })
  walletType: WalletType;

  @Column('decimal', { precision: 19, scale: 4 })
  amount: number;

  @Column({ length: 3, default: 'ZMW' })
  currency: string;

  @Column({ nullable: false })
  reference: string;

  @Column('text')
  encryptedPin: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    default: TransactionType.B2C,
  })
  transactionType: TransactionType;

  @Column({
    type: 'enum',
    enum: DisbursementStatus,
    default: DisbursementStatus.PENDING,
  })
  status: DisbursementStatus;

  @Column({ nullable: true })
  airtelReferenceId: string;

  @Column({ nullable: true })
  airtelMoneyId: string;

  @Column({ nullable: true, length: 50 })
  errorCode: string;

  @Column('text', { nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## Migration Strategy

**Migration File**: `src/migrations/TIMESTAMP-create-disbursements.ts`

**Operations**:
1. Create `disbursements` table with all columns
2. Create indexes (tenantId, unique externalId, status, createdAt)
3. Add CHECK constraint: `amount > 0`
4. Add foreign key to `tenants` table if enforced

**Rollback**:
1. Drop `disbursements` table (cascades indexes and constraints)

---

## Reused Entities

**Tenant**: Existing entity, no changes required. Disbursement references via `tenantId`.

**Audit**: Existing entity. AuditSubscriber will automatically log Disbursement entity changes (INSERT, UPDATE).

---

## Data Retention

Per constitution requirements:
- **Successful disbursements**: Retain indefinitely or per business requirements (minimum 7 years for financial compliance)
- **Failed disbursements**: Retain for 90 days minimum for debugging
- **Personal data (MSISDN)**: Subject to GDPR/data protection - mask or pseudonymize after retention period

---

## Summary

- **New Tables**: 1 (disbursements)
- **New Enums**: 3 (DisbursementStatus, WalletType, TransactionType)
- **Reused Entities**: Tenant, Audit
- **Indexes**: 5 (primary + 4 secondary)
- **Constraints**: 2 (unique externalId per tenant, positive amount)

Ready for contract generation and implementation.
