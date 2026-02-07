# Airtel Products Required for Payment Gateway

## Executive Summary

Based on the gateway's current architecture and payment flows, this document outlines the Airtel products required to achieve feature parity with the existing MTN integration.

---

## Core Required Products

### 1. Collection-APIs (Latest Version 3.0) ✅ **CRITICAL**

**Purpose:** Collecting payments from customers

**Use Cases:**
- Payment collection from customer mobile wallets
- Request-to-pay functionality
- Balance checks on collection account
- Transaction status queries

**Gateway Integration:**
- Maps to: `CollectionService.requestToPay()`
- Equivalent to: MTN MoMo Collection API
- Flows: `PaymentFlow.COLLECTION`

---

### 2. Disbursement-APIs (Latest Version 2.0) ✅ **CRITICAL**

**Purpose:** Sending money to users/merchants

**Use Cases:**
- Merchant payouts
- Customer refunds
- Bulk disbursements
- Settlement transfers
- Balance checks on disbursement account

**Gateway Integration:**
- Maps to: `DisbursementService.transfer()`
- Equivalent to: MTN MoMo Disbursement API
- Flows: `PaymentFlow.DISBURSEMENT`

---

## Highly Recommended Products

### 3. KYC (Latest Version 2.0) 🔵 **IMPORTANT**

**Purpose:** Account validation and verification

**Use Cases:**
- Validate account holder status before transactions
- Verify user identity
- Check account information
- Reduce fraud and failed transactions

**Gateway Integration:**
- Maps to: `DisbursementService.validateAccountHolderStatus()`
- Enhances: Pre-transaction validation
- Entity: `ValidateAccountHolderStatusDto`

---

### 4. Account 🔵 **IMPORTANT**

**Purpose:** Account balance and details management

**Use Cases:**
- Get account balance across all services
- Check account holder details
- Pre-transaction balance validation
- Real-time balance monitoring

**Gateway Integration:**
- Maps to: `getAccountBalance()` methods
- Used by: Balance validation service
- Prevents: Insufficient balance errors

---

### 5. Transactions-Summary-APIs (Latest Version 2.0) 🔵 **RECOMMENDED**

**Purpose:** Transaction history and reconciliation

**Use Cases:**
- Query transaction history
- Reconciliation automation
- Audit trail verification
- Transaction dispute resolution

**Gateway Integration:**
- Maps to: `CollectionService.reconcileCollections()`
- Supports: Audit module requirements
- Enhances: Automated reconciliation

---

## Optional/Nice-to-Have Products

### 6. Remittance-APIs-V2

**Use Case:** International money transfers  
**Status:** Not currently in gateway scope  
**Consider if:** Planning cross-border payment features

---

### 7. Billers Callback (Latest Version 2.0)

**Use Case:** Bill payment services  
**Status:** Not currently implemented  
**Consider if:** Integrating with utility/biller systems

---

### 8. Cash-In-APIs & Cash-Out-APIs (Latest Version 2.0)

**Use Case:** Agent network functionality  
**Status:** Not currently implemented  
**Consider if:** Supporting agent-based transactions

---

### 9. TopUp Notification (Latest Version 2.0)

**Use Case:** Airtime/data top-up notifications  
**Status:** Not currently implemented  
**Consider if:** Planning mobile top-up services

---

## Not Needed (Out of Scope)

The following Airtel products are **NOT required** for the current gateway architecture:

| Product | Reason |
|---------|--------|
| ❌ ATM Withdrawal API | Not applicable to digital-only gateway |
| ❌ Loan Lifecycle Management | Loan services out of scope |
| ❌ Partner-Portal | UI/portal feature, not API integration |
| ❌ Loan User KYC | Loan-specific functionality |
| ❌ Term Loans | Loan services out of scope |
| ❌ OverDraft Loans | Loan services out of scope |
| ❌ Loan Disbursement | Loan services out of scope |
| ❌ Loan Repayment | Loan services out of scope |

---

## Implementation Priority

### Phase 1: Core Payment Flows
1. **Collection-APIs V3** - Enable payment collection
2. **Disbursement-APIs V2** - Enable payouts and transfers

### Phase 2: Account Management
3. **Account API** - Balance checks and account validation
4. **KYC V2** - Pre-transaction validation

### Phase 3: Reconciliation & Audit
5. **Transactions-Summary-APIs V2** - Automated reconciliation

---

## Current Gateway Architecture Mapping

```
┌─────────────────────────────────────────────────────────────────┐
│                        GATEWAY SYSTEM                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Payment Providers (Adapters)                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │  │
│  │  │   MTN    │  │  AIRTEL  │  │ ZAMTEL   │               │  │
│  │  │ ✅ Active │  │ 🔄 Next  │  │ 📋 Future│               │  │
│  │  └──────────┘  └──────────┘  └──────────┘               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Airtel Integration Requirements

**Required Services:**
- `AirtelCollectionService` (equivalent to MTN's CollectionService)
- `AirtelDisbursementService` (equivalent to MTN's DisbursementService)
- `AirtelService` (base service for authentication/token management)

**Required DTOs:**
- Collection request/response DTOs
- Disbursement request/response DTOs
- KYC validation DTOs
- Account balance DTOs

**Required Configuration:**
```yaml
airtel:
  base_url: '<airtel-api-base-url>'
  collection:
    subscription_key: '<key>'
    target_environment: 'production'
  disbursement:
    subscription_key: '<key>'
    target_environment: 'production'
  credentials:
    client_id: '<client-id>'
    client_secret: '<client-secret>'
```

---

## Feature Parity Matrix

| Feature | MTN Status | Airtel Products Needed |
|---------|-----------|------------------------|
| Payment Collection | ✅ Implemented | Collection-APIs V3 |
| Disbursement | ✅ Implemented | Disbursement-APIs V2 |
| Balance Check | ✅ Implemented | Account API |
| KYC Validation | ✅ Implemented | KYC V2 |
| Status Query | ✅ Implemented | Collection/Disbursement APIs |
| Webhook Callbacks | ✅ Implemented | Collection/Disbursement APIs |
| Reconciliation | ✅ Implemented | Transactions-Summary-APIs V2 |

---

## Next Steps

1. **Obtain API Credentials:**
   - Sign up for Airtel Money API developer access
   - Request sandbox credentials for testing
   - Obtain production credentials after testing

2. **Review API Documentation:**
   - Collection-APIs V3 documentation
   - Disbursement-APIs V2 documentation
   - Account API documentation
   - KYC V2 API documentation
   - Transactions-Summary-APIs V2 documentation

3. **Implementation Plan:**
   - Create Airtel module structure (`src/modules/airtel/`)
   - Implement authentication/token management
   - Implement collection service
   - Implement disbursement service
   - Add webhook handlers
   - Implement reconciliation logic

4. **Testing:**
   - Sandbox environment testing
   - Integration testing with gateway flows
   - End-to-end testing with real scenarios
   - Production readiness validation

---

## Additional Considerations

### Security
- Store Airtel credentials in environment variables
- Implement webhook signature verification
- Use idempotency keys for all requests
- Implement proper error handling and retry logic

### Monitoring
- Add Airtel-specific health checks
- Monitor API response times
- Track success/failure rates
- Set up alerting for API issues

### Compliance
- Ensure PCI-DSS compliance for payment data
- Implement proper audit logging
- Follow data privacy regulations
- Maintain transaction records per requirements

---

**Document Version:** 1.0  
**Last Updated:** February 5, 2026  
**Status:** Ready for Implementation
