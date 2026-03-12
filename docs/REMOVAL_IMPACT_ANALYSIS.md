# Impact Analysis: Removing MTN Disbursement Module

## 🔴 WHAT WILL BREAK (3 Items)

### 1. **MtnModule** (`src/modules/mtn/mtn.module.ts`)
```typescript
// Line 7
import { DisbursementModule } from './disbursement/disbursement.module';

// Line 10
imports: [HttpModule, ConfigModule, CollectionModule, forwardRef(() => DisbursementModule)],
```
**Impact**: ❌ Import will fail - Cannot find DisbursementModule in mtn/disbursement/
**Solution**: Remove both import and forwardRef

---

### 2. **PaymentsModule** (`src/modules/payments/payments.module.ts`)
```typescript
// Line 12
import { DisbursementModule } from '../mtn/disbursement/disbursement.module';

// Line 19 (inside Module imports array)
DisbursementModule,
```
**Impact**: ❌ Import will fail - Cannot find DisbursementModule
**Solution**: Remove both import and DisbursementModule from imports

---

### 3. **Database Configuration** (`src/common/database/database.config.ts`)
```typescript
// Line 16
import { Disbursement, DisbursementTransaction } from 'src/modules/mtn/disbursement/entities';

// Lines 38 & 56 (inside entities array)
entities: [Tenant, User, Payment, Transaction, Audit, IdempotencyKey, 
           Disbursement, DisbursementTransaction,  // ← These will fail
           AirtelDisbursement, WebhookLog, ...]
```
**Impact**: 
- ❌ Import fails - Cannot find entities
- ❌ Database won't initialize (missing entity definitions)
- **Critical**: TypeORM needs these entities registered OR migrations need to drop the tables

**Solution**: 
- Remove the import of MTN Disbursement & DisbursementTransaction
- Remove from entities array
- Create migration to DROP TABLE disbursement_transaction and disbursement (if they exist in DB)

---

## ✅ WHAT WILL NOT BREAK

### 1. **AppModule** ✓
```typescript
// src/app.module.ts - Line 25
import { DisbursementsModule } from './modules/disbursements/disbursements.module';
```
✅ **Still works** - Uses the NEW DisbursementsModule, not the old one

---

### 2. **REST API Endpoints** ✓
```typescript
POST   /api/v1/disbursements
GET    /api/v1/disbursements/{id}
GET    /api/v1/disbursements
```
✅ **Still works** - These come from the new DisbursementsController

---

### 3. **Swagger Documentation** ✓
✅ **Still works** - Swagger only references the new DisbursementsModule

---

### 4. **MTN Collection Module** ✓
```typescript
src/modules/mtn/collection/
```
✅ **Still works** - This is separate from disbursement
- MTN can still receive payments (collection)
- MTN just won't be able to send money (disbursement) - but we have Airtel for that anyway

---

## 🎯 SAFE REMOVAL CHECKLIST

```bash
# Step 1: Update MtnModule
# File: src/modules/mtn/mtn.module.ts
- Remove: import { DisbursementModule } from './disbursement/disbursement.module';
- Remove: forwardRef(() => DisbursementModule) from imports array

# Step 2: Update PaymentsModule
# File: src/modules/payments/payments.module.ts
- Remove: import { DisbursementModule } from '../mtn/disbursement/disbursement.module';
- Remove: DisbursementModule from imports array

# Step 3: Update Database Config
# File: src/common/database/database.config.ts
- Remove: import { Disbursement, DisbursementTransaction } from 'src/modules/mtn/disbursement/entities';
- Remove: Disbursement, DisbursementTransaction from entities array (2 locations)

# Step 4: Create Migration
# Drop the old tables if they exist
npx typeorm migration:create src/database/migrations/DropMtnDisbursement

# In the migration file:
# - DROP TABLE IF EXISTS disbursement_transaction CASCADE;
# - DROP TABLE IF EXISTS disbursement CASCADE;

# Step 5: Delete Directory
rm -rf src/modules/mtn/disbursement/

# Step 6: Rebuild & Test
npm run build
npm test
```

---

## 📋 SUMMARY

| Item | Impact | Effort | Risk |
|------|--------|--------|------|
| MtnModule import | ❌ Break | 1 min | Low |
| PaymentsModule import | ❌ Break | 1 min | Low |
| Database entities | ❌ Break | 5 min + migration | Medium |
| Delete directory | ✅ Safe | 1 min | None |
| **Total** | **3 breaks** | **~10 min** | **Low-Medium** |

---

## 💡 KEY INSIGHTS

**Good News:**
1. No active business logic depends on MTN disbursement
2. The new Airtel disbursement module is a complete replacement
3. All REST API endpoints come from the new module
4. MTN collection still works independently

**Bad News:**
1. Database config explicitly registers the old entities
2. MtnModule and PaymentsModule still import from it
3. Need a migration to drop old tables (if they exist in your DB)

**Recommendation:**
✅ **Safe to remove** - Just follow the 6-step checklist above.
The new DisbursementsModule is a superior design and handles Airtel completely.
