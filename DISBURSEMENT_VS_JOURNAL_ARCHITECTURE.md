# Disbursement Architecture: Current Implementation vs. Journal-Based

## Visual Architecture

### Current Implementation (What We're Using)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Business (Tenant)                            │
│                    Initiates Payout                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ POST /api/v1/disbursements
                         │ {externalId, payeeMsisdn, amount, pin}
                         ▼
        ┌────────────────────────────────────┐
        │   DisbursementsController          │
        │   ────────────────────────────────│
        │  • Validates input (DTO)           │
        │  • Enforces API key auth           │
        │  • Extracts tenantId               │
        └────────────┬─────────────────────┘
                     │
                     ▼
        ┌────────────────────────────────────┐
        │   DisbursementsService             │
        │   ────────────────────────────────│
        │  1. Validate request               │
        │  2. Normalize MSISDN               │
        │  3. Check idempotency              │
        │  4. Encrypt PIN                    │
        │  5. Create PENDING record          │
        │  6. Call Airtel API                │
        │  7. Update status (SUCCESS/FAILED) │
        │  8. Return response                │
        └────────────┬───────────────────────┘
                     │
        ┌────────────┴─────────────────┬──────────────────┐
        │                              │                  │
        ▼                              ▼                  ▼
   ┌─────────────┐           ┌─────────────────────┐ ┌──────────┐
   │ Disbursement│           │ AirtelDisbursement  │ │AirtelSign│
   │  Repository │           │    Service          │ │ Service  │
   │ ─────────── │           │ ─────────────────── │ │──────────│
   │  • Query    │◄──────────│ • POST /disb...     │ │• Encrypt │
   │  • Save     │           │ • GET status        │ │  PIN     │
   │  • Filter   │           │ • Handle errors     │ │• Sign    │
   └─────────────┘           └─────────────────────┘ │  requests│
        │                                            └──────────┘
        │ SQL: INSERT/UPDATE
        │
        ▼
   ┌──────────────────────────────────────┐
   │     disbursements Table              │
   │  ──────────────────────────────────│
   │ id, tenantId, externalId            │
   │ payeeMsisdn, amount, currency       │
   │ walletType, transactionType         │
   │ status, airtelReferenceId           │
   │ airtelMoneyId, errorCode            │
   │ errorMessage, createdAt, updatedAt  │
   │                                     │
   │ [Database Constraints]              │
   │ • PK: id (UUID)                     │
   │ • Unique: (tenantId, externalId)    │
   │ • Index: tenantId, status, createdAt│
   │ • Check: amount > 0                 │
   └──────────────────────────────────────┘
        │
        │ Data reaches database
        │
        └─ [Audited by AuditSubscriber]
           [Timestamps: created, updated]
           [No journal entries needed]

                ┌──────────────────┐
                │ Airtel Ecosystem │
                │ ──────────────── │
                │ • Recipient wallet│
                │   (external to us)│
                │ • Airtel confirms │
                │   success/failure │
                │ • Returns: ref ID,│
                │   money ID, status│
                └──────────────────┘
```

### Alternative: Journal-Based Architecture (NOT What We're Using)

```
If we were tracking internal accounts (NOT for disbursements):

┌─────────────────────────────────────────────────────────────────┐
│            Company's Accounting System                          │
│       (SAP, QuickBooks, our custom accounting module)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ "We disbursed $500"
                         ▼
        ┌────────────────────────────────────┐
        │       JournalService               │
        │   ─────────────────────────────   │
        │  • Create journal entry            │
        │  • Calculate debits/credits        │
        │  • Update account balances         │
        └────────────┬─────────────────────┘
                     │
        ┌────────────┴──────────────────────┐
        │                                   │
        ▼                                   ▼
   ┌─────────────┐                  ┌──────────────┐
   │   Journal   │                  │ Journal Lines│
   │  ─────────  │                  │ ──────────── │
   │ ID          │◄─────────────────│ ID           │
   │ Date        │                  │ JournalId    │
   │ Reference   │                  │ AccountId    │
   │ Description │                  │ Amount       │
   │ Status      │                  │ Type (Dr/Cr) │
   └─────────────┘                  └──────────────┘
        │                                   │
        ▼                                   ▼
   ┌─────────────────────────────────────────────┐
   │         Chart of Accounts                   │
   │  ─────────────────────────────────────────│
   │ • Bank Account: -$500 (Cash paid out)      │
   │ • Expense Account: +$500 (Payout expense)  │
   │ • Running balance updated                  │
   └─────────────────────────────────────────────┘

This approach used ONLY if:
- You're building accounting software
- You need to track internal account movements
- You need double-entry bookkeeping
- **NOT for simple payout tracking**
```

---

## Responsibility Matrix

### Current Implementation (What We Use)

| Responsibility | Location | How It Works |
|---|---|---|
| **Initiate Payout** | DisbursementsService.createDisbursement() | Calls Airtel API with encrypted PIN |
| **Track Transaction** | Disbursement entity (database row) | Each payout creates one record |
| **Record Status** | status field (PENDING/PROCESSING/SUCCESS/FAILED) | Updated based on Airtel response |
| **Idempotency** | Unique constraint (tenantId, externalId) + service check | Returns existing record for duplicate |
| **Error Tracking** | errorCode, errorMessage fields | Populated when Airtel returns error |
| **Reconciliation** | airtelReferenceId, airtelMoneyId fields | Match against Airtel statement |
| **Audit Trail** | AuditSubscriber + timestamps | Logs who created it and when |
| **Wallet Mgmt** | NOT IN OUR SYSTEM | Airtel manages recipient wallet |
| **Balance Tracking** | Query disbursements table | Sum successful disbursements |
| **Multi-tenancy** | tenantId field + repository filtering | Tenant isolation enforced |

### If Using Journals (NOT What We Do)

| Responsibility | Location | How It Works |
|---|---|---|
| **Initiate Payout** | Same: DisbursementsService | Calls Airtel API |
| **Track Transaction** | Journal + Journal Lines (2-3 tables) | Requires debit/credit entries |
| **Record Status** | Journal status field | Still need disbursement record |
| **Idempotency** | Still needed in disbursement table | Unique constraint still required |
| **Error Tracking** | Still in disbursement record | Journals don't store errors |
| **Reconciliation** | Same: Disbursement fields | Journals don't help here |
| **Audit Trail** | Journal audit trail | More verbose, two systems logging |
| **Wallet Mgmt** | NOT IN SYSTEM | Airtel still manages it |
| **Balance Tracking** | Sum journal line amounts | More complex queries |
| **Multi-tenancy** | Tenant journal per company | More complex filtering |

**Result**: Journals add complexity without value for our use case.

---

## Data Model Comparison

### Current: Disbursement-Centric (Simple, Fast, Clear)

```sql
-- Single table, single query to get all info
SELECT * FROM disbursements 
WHERE tenantId = 'ABC123' AND externalId = 'order-001';

Result:
{
  id: 'uuid-1',
  tenantId: 'ABC123',
  externalId: 'order-001',
  payeeMsisdn: '0977123456',
  amount: 500.00,
  status: 'SUCCESS',
  airtelReferenceId: 'AIR-12345',
  errorCode: null,
  createdAt: '2025-02-06T10:30:00Z'
}

✅ Fast: Single table lookup
✅ Clear: All info in one record
✅ Simple: No joins needed
```

### Alternative: Journal-Centric (Complex, Slower, Verbose)

```sql
-- Multiple tables needed
SELECT 
  j.id, j.reference, j.created_at,
  jl.account_id, jl.amount, jl.debit_credit,
  d.id, d.external_id, d.airtel_reference_id
FROM journals j
LEFT JOIN journal_lines jl ON j.id = jl.journal_id
LEFT JOIN disbursements d ON j.reference = d.external_id
WHERE j.tenant_id = 'ABC123' AND d.external_id = 'order-001';

Result (multiple rows):
[
  {journal_id, reference: 'order-001', Bank_Account, -500, Debit, disburse_id, AIR-12345},
  {journal_id, reference: 'order-001', Expense_Account, +500, Credit, disburse_id, AIR-12345}
]

❌ Slower: Multiple joins
❌ Complex: Reconstruct from multiple rows
❌ Redundant: Both journals and disbursements store transaction
```

---

## Query Patterns: Simple vs. Complex

### Query 1: "What disbursements succeeded this month?"

**Current Implementation (Simple)**:
```typescript
const successful = await disbursementRepository.find({
  where: {
    tenantId: 'ABC123',
    status: DisbursementStatus.SUCCESS,
    createdAt: Between(monthStart, monthEnd)
  }
});
const total = successful.reduce((sum, d) => sum + parseDecimal(d.amount), 0);
```

**With Journals (Complex)**:
```typescript
const journals = await journalRepository.find({
  where: {
    tenantId: 'ABC123',
    reference: Like('order-%'),
    createdAt: Between(monthStart, monthEnd)
  },
  relations: ['lines']
});
const lines = journals.flatMap(j => j.lines);
const expenses = lines.filter(l => l.accountId === PAYOUT_EXPENSE_ACCOUNT);
const total = expenses.reduce((sum, l) => sum + l.amount, 0);
```

### Query 2: "What failed and why?"

**Current (Simple)**:
```typescript
const failures = await disbursementRepository.find({
  where: {
    tenantId: 'ABC123',
    status: DisbursementStatus.FAILED
  },
  order: { createdAt: 'DESC' }
});
// failures[0].errorCode, failures[0].errorMessage available directly
```

**With Journals (Complex)**:
```typescript
// Journal doesn't store error info - must JOIN disbursements anyway
const failures = await disbursementRepository.find({
  where: {
    tenantId: 'ABC123',
    status: DisbursementStatus.FAILED
  }
  // Journal info not even needed - creating extra work
});
```

---

## When Journals Are Worth The Complexity

| Scenario | Need Journals? | Why/Why Not |
|----------|---|---|
| **Simple payout tracking** | ❌ NO | Disbursement table sufficient |
| **Compliance auditing** | ⚠️ MAYBE | AuditSubscriber + timestamps sufficient |
| **Revenue/expense accounting** | ✅ YES | Need double-entry bookkeeping |
| **Multi-currency transactions** | ⚠️ MAYBE | Depends if tracking forex gains/losses |
| **Commission calculations** | ✅ YES | Complex splits requiring GL entries |
| **Reconciliation with external bank** | ⚠️ MAYBE | Can do via disbursement fields |
| **Regulatory/tax reporting** | ✅ YES | May need GL detail levels |

**Disbursements scenario**: ❌ NO - Simple tracking sufficient

---

## Cost-Benefit Analysis

| Aspect | Journals | Current Model | Winner |
|--------|----------|---------------|--------|
| **Complexity** | High (3 tables min) | Low (1 table) | ✅ Current |
| **Query Speed** | Slow (joins, aggregates) | Fast (direct lookup) | ✅ Current |
| **Storage** | ~6 bytes per payout | ~1 byte per payout | ✅ Current |
| **Error Tracking** | Not native | Built-in | ✅ Current |
| **Audit Trail** | Rich history | AuditSubscriber | 🟰 Tie |
| **Dev Time** | 3-4 weeks extra | Already done | ✅ Current |
| **Maintenance** | Complex migrations | Simple queries | ✅ Current |
| **Revenue Tracking** | Excellent | Requires aggregation | ✅ Journals |
| **Multi-currency GL** | Essential | Not designed for | ✅ Journals |

**For disbursements**: Current model wins on every metric except complex accounting scenarios we don't have.

---

## Conclusion: Data Flow

```
┌─────────────┐
│  Business   │
│ "Disburse   │
│  500 ZMW"   │
└──────┬──────┘
       │
       ▼
┌──────────────────┐     ┌─────────────────────┐
│ DisbursementDTO  │────▶│ Validate & Normalize│
│ (Request Body)   │     │ - Check amount > 0  │
└──────────────────┘     │ - Format MSISDN     │
                         │ - Validate PIN      │
                         └──────┬──────────────┘
                                │
                         ┌──────▼──────────────┐
                         │ Check Idempotency   │
                         │ - Existing record?  │
                         │ - Return if found   │
                         └──────┬──────────────┘
                                │
                         ┌──────▼──────────────┐
                         │ Encrypt PIN (RSA)   │
                         │ Create PENDING      │
                         │ record in DB        │
                         └──────┬──────────────┘
                                │
                         ┌──────▼──────────────┐
                         │ Call Airtel API     │
                         │ Send payout request │
                         └──────┬──────────────┘
                                │
                         ┌──────▼──────────────┐
                         │ Get Airtel Response │
                         │ ├─ SUCCESS:         │
                         │ │  Update status    │
                         │ │  Save ref IDs     │
                         │ │                   │
                         │ └─ FAILED:          │
                         │    Record error     │
                         │    code & message   │
                         └──────┬──────────────┘
                                │
                         ┌──────▼──────────────┐
                         │ Return Disbursement │
                         │ {id, status,       │
                         │  airtelRef, error} │
                         └──────┬──────────────┘
                                │
                         ┌──────▼──────────────┐
                         │ AuditSubscriber     │
                         │ Logs the change     │
                         │ (automatic)         │
                         └──────────────────────┘

                    ✅ COMPLETE
              No journals, no wallet mgmt
                   Just records what
                   Airtel told us
```

This is **sufficient, fast, and clear** for our use case.
