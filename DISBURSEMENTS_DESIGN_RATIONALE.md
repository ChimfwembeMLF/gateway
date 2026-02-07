# Why Disbursements Don't Use Journals, Journal Lines, and Wallets

## Quick Answer

The disbursement feature is a **direct money-out transaction** to external Airtel Money wallets. It doesn't need journals, journal lines, or internal wallet tracking because:

1. **Journals are internal ledger records** - We're sending money OUT to customers' external wallets, not managing internal account entries
2. **Journal lines track account debits/credits** - We record the transaction in the `disbursement` table instead
3. **Wallets are customer-facing ledgers** - Airtel manages the recipient's wallet; we just initiate the transfer and track the request/response

---

## What Each Component Does

### Journals / Journal Lines (NOT used for disbursements)

**Purpose**: Internal double-entry bookkeeping system to track money moving between internal accounts

**Example**: When a business receives a payment collection:
- **Journal Entry**: Company receives 1,000 ZMW from customer
- **Journal Lines**:
  - Dr. Cash/Bank account: +1,000 ZMW
  - Cr. Revenue account: -1,000 ZMW (liability until settled)

**Why NOT used for disbursements**:
- Disbursements are **outgoing external transactions**, not internal account transfers
- The recipient (customer's Airtel wallet) is external, not an internal account we manage
- Airtel handles the actual wallet update on their side
- We just need to record "we initiated a payout" and "Airtel confirmed it succeeded/failed"

### Wallets (NOT used for disbursements)

**Purpose**: Track running balance of money available in an account

**Example**: In the payments (collection) module:
```typescript
// Wallet entity tracks how much money each tenant has collected
Wallet {
  tenantId: 'ABC123',
  balance: 50000.00 ZMW,      // How much they've collected from customers
  lastUpdated: 2025-02-06
}
```

**Why NOT used for disbursements**:
- Disbursements send money TO external Airtel wallets (not FROM internal wallet)
- Airtel manages the recipient's wallet, not us
- We don't maintain a "business payout wallet" - each disbursement is an independent transaction
- The source of funds is Airtel's business account, not our system

### Disbursement Entity (WHAT WE ACTUALLY USE)

**Purpose**: Track payout requests to external wallets

**What it records**:
```typescript
Disbursement {
  id: 'uuid',                         // Unique record in our system
  tenantId: 'ABC123',                 // Which business initiated this
  externalId: 'order-2024-001',       // Their transaction ID (for idempotency)
  payeeMsisdn: '0977123456',          // Who we're paying
  amount: 500.50,                     // How much
  currency: 'ZMW',                    // In what currency
  reference: 'INV-2024-001',          // What it's for (invoice, salary, etc)
  encryptedPin: '...base64...',       // Encrypted PIN (required by Airtel)
  walletType: 'NORMAL',               // Type of recipient wallet
  transactionType: 'B2C',             // B2C vs B2B routing
  
  // Status tracking
  status: 'SUCCESS',                  // Did it work? (PENDING/PROCESSING/SUCCESS/FAILED)
  airtelReferenceId: 'AIR-12345',    // Airtel's transaction ID
  airtelMoneyId: 'MONEY-67890',       // Airtel's wallet transaction ID
  errorCode: null,                    // If failed, why?
  errorMessage: null,                 // Human-readable error
  
  createdAt: 2025-02-06T10:30:00Z,
  updatedAt: 2025-02-06T10:31:00Z
}
```

---

## Data Flow Comparison

### ❌ NOT How Disbursements Work (What journals are for):

```
Internal Business Account
├── Money In (Collections/Revenue)
│   └── Journal Entry: Dr. Bank, Cr. Revenue
├── Money Out (Expenses/Payouts)
│   └── Journal Entry: Dr. Expense, Cr. Bank
└── Running Balance = Receipts - Payments
```

### ✅ How Disbursements Actually Work:

```
Our System                         Airtel System
├─ Disbursement Record      ──→    External Wallet
│  (What we initiated)
│
├─ Status Tracking
│  ├─ PENDING (sent to Airtel)
│  ├─ PROCESSING (Airtel working on it)
│  └─ SUCCESS/FAILED (Airtel responded)
│
└─ We record Airtel's response IDs
   for reconciliation
```

**Key Difference**: We're not managing internal accounts; we're initiating external transfers and tracking the request/response.

---

## What the Disbursement Entity Provides

The `Disbursement` entity serves all the purposes that would require journals + wallets + transaction lines if we were managing internal accounts:

| Need | Journals Would Do | Disbursement Table Actually Does |
|------|-------------------|----------------------------------|
| Track payout attempt | Dr. Payout Expense, Cr. Bank | Record in `disbursements` row |
| Identify the transaction | Debit/credit reference | `externalId` + `airtelReferenceId` |
| Know if it succeeded | Check final balance | `status` field (SUCCESS/FAILED) |
| Reconcile with bank | Match journal entries to bank statement | Match `airtelReferenceId` to Airtel statement |
| Track what failed | Review journal notes | `errorCode` + `errorMessage` |
| Report on payouts | Sum journal entries by type | Query disbursements by status/date |
| Prevent duplicates | Unique constraint on reference | Unique constraint on `(tenantId, externalId)` |
| Audit trail | Journal history | TypeORM AuditSubscriber + timestamps |

---

## Real Examples

### Example 1: Salary Payout (Where Journals WOULD Be Used)

```
Company Accounting System (would need journals):
├─ Payroll Expense Journal
│  └─ Dr. Salary Expense: 50,000 ZMW
│  └─ Cr. Bank Account: 50,000 ZMW
└─ Resulting Bank Balance: -50,000 ZMW

Our Gateway (disbursements, no journals):
├─ Create disbursement record
│  └─ status: PENDING
├─ Call Airtel API
│  └─ "Send 50,000 ZMW to employee wallet"
├─ Airtel responds with reference ID
│  └─ status: SUCCESS
│  └─ airtelReferenceId: AIR-98765
└─ Company's own accounting system handles the journal entry
   (not our responsibility - they might use SAP, QuickBooks, etc)
```

**Key insight**: The company handles their own journals in their accounting system. We just execute the payout.

### Example 2: Refund to Customer (Where Wallets WOULD Be Used)

```
Customer's Airtel Wallet (managed by Airtel, not us):
├─ Initial Balance: 5,000 ZMW
├─ After Refund: 5,500 ZMW (+500 from our disbursement)
└─ Airtel manages this, we don't see it

Our Gateway (tracking only):
├─ Disbursement record
│  ├─ payeeMsisdn: '0977123456'
│  ├─ amount: 500.00
│  ├─ status: SUCCESS
│  ├─ airtelMoneyId: 'AIRTEL-TX-12345'  ← Proof Airtel updated their wallet
│  └─ reference: 'REFUND-ORDER-001'
└─ We don't maintain a "wallet" for customers
   (Airtel does; we just track our transaction)
```

**Key insight**: Airtel owns and manages customer wallets. We just initiate transfers.

---

## How the System Currently Handles Requirements That Journals/Wallets Would

### Requirement: Track money going out
**Without Journals**: 
```typescript
// DisbursementsService - just records the transaction
const disbursement = await repo.save({
  tenantId, externalId, amount, status: 'SUCCESS'
});
// Query disbursements to see what went out
const total = disbursements
  .filter(d => d.status === 'SUCCESS')
  .reduce((sum, d) => sum + parseDecimal(d.amount), 0);
```

### Requirement: Know if a payout succeeded
**Without Wallets**:
```typescript
// Check disbursement status instead of wallet balance
const result = await disbursementsService.getDisbursement(id, tenantId);
console.log(result.status); // 'SUCCESS' or 'FAILED'
console.log(result.errorMessage); // Why it failed if applicable
```

### Requirement: Prevent duplicate payouts
**Without Journal uniqueness**:
```typescript
// Use unique constraint on (tenantId, externalId)
@Index(['tenantId', 'externalId'], { unique: true })

// Check before creating
const existing = await repo.findByExternalId(tenantId, externalId);
if (existing) return existing; // Idempotency
```

### Requirement: Audit trail
**Without Journal history**:
```typescript
// Use AuditSubscriber to auto-log state changes
// Plus timestamps on disbursement record
disbursement.createdAt    // When initially created (PENDING)
disbursement.updatedAt    // When status changed to SUCCESS
// AuditSubscriber logs: who changed it, what changed, when
```

---

## When You WOULD Use Journals + Wallets

### Journal Scenario 1: Business Receives Collection
```
When a customer pays the business money via Airtel Collection API:
├─ We receive payment from customer's wallet
├─ Our system records in payments table
├─ Business's own accounting system creates:
│  └─ Journal: Dr. Bank, Cr. Revenue
└─ Business updates their wallet/cash position
```

### Journal Scenario 2: Company-Internal Fund Transfer
```
If the business wanted to move money between internal accounts:
├─ Account A: Operations (100,000 ZMW)
├─ Account B: Marketing (50,000 ZMW)
├─ Transfer 20,000 ZMW from Operations to Marketing:
│  └─ Journal: Dr. Marketing, Cr. Operations
└─ New: Operations (80,000 ZMW), Marketing (70,000 ZMW)
```

### Wallet Scenario: Customer Account Balance
```
If we were building a prepaid wallet service:
├─ Customer loads 1,000 ZMW into their wallet
├─ Customer makes purchases (reduces wallet)
├─ Wallet balance = accumulated transactions
└─ Query wallet to know current balance available for transactions
```

**None of these apply to disbursements** because:
- We're not managing company internal accounts (that's their job)
- We're not managing customer wallets (that's Airtel's job)
- We're just executing external payouts and recording the result

---

## Summary: What the Disbursement Entity Replaces

| Accounting Layer | Our Implementation |
|------------------|-------------------|
| **Journal** (ledger of debits/credits) | `Disbursement` entity (transaction record) |
| **Journal Lines** (individual account entries) | Single `Disbursement` row (outgoing transaction) |
| **Account Balance** (running money total) | Query `disbursements WHERE status='SUCCESS'` to sum |
| **Audit Trail** (who changed what) | AuditSubscriber logs + timestamps |
| **Wallet** (recipient balance) | Managed by Airtel, we just track reference ID |

The `Disbursement` entity is a **lightweight transaction record**, not a full accounting system, because:
- We don't need double-entry accounting (external party handles that)
- We don't manage recipient wallets (external party does)
- We just need to: initiate transfer, record Airtel's response, enable queries

---

## If You Add Wallet Functionality Later

If in Phase 5+ you add "**Tenant Wallet for Disbursement Limits**" (e.g., "tenant can only disburse up to their monthly limit"):

```typescript
TenantDisbursementWallet {
  tenantId: 'ABC123',
  monthlyLimit: 100000.00,
  disburledThisMonth: 45000.00,
  remainingBalance: 55000.00,
  lastResetDate: 2025-02-01
}

// Before disbursement
if (createDto.amount > wallet.remainingBalance) {
  throw new Error('Exceeds monthly disbursement limit');
}

// After successful disbursement
wallet.disbursedThisMonth += createDto.amount;
wallet.remainingBalance -= createDto.amount;
```

But this is a **limit/quota tracking wallet**, not an accounting journal. It's separate from the disbursement transaction record.

---

## Conclusion

**Disbursements use a simple transaction record model** because:

1. ✅ We're initiating external payouts (not managing internal accounts)
2. ✅ Airtel manages recipient wallets (not us)
3. ✅ Businesses handle their own accounting in their systems (not us)
4. ✅ We just need to track "did we send it" and "did it succeed"
5. ✅ The `Disbursement` entity provides all necessary fields for this

**No journals, no journal lines, no internal wallet management needed** - just a straightforward transaction record with status tracking and audit trail.
