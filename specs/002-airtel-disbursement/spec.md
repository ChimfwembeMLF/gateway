# Feature Specification: Airtel Money Disbursements

**Feature Branch**: `002-airtel-disbursement`  
**Created**: February 5, 2026  
**Status**: Draft  
**Input**: User description: "Add Airtel Money disbursement/payout functionality to enable businesses to send money to customer wallets"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Business Sends Payment to Customer Wallet (Priority: P1)

A business (tenant) needs to send money to a customer's Airtel Money wallet as a payout, refund, or salary payment. The system initiates the disbursement through the Airtel API and tracks the transaction status.

**Why this priority**: Core disbursement capability - without this, the feature provides no value. This is the fundamental use case that enables all payout functionality.

**Independent Test**: Can be fully tested by calling the disbursement endpoint with valid customer MSISDN and amount, then verifying the money is credited to the customer's wallet and transaction status is recorded.

**Acceptance Scenarios**:

1. **Given** a tenant has valid Airtel credentials and sufficient balance, **When** they request a disbursement of 1000 ZMW to customer wallet 975123456, **Then** the system creates a transaction record, calls Airtel API, and returns transaction ID with "pending" status
2. **Given** Airtel successfully processes the disbursement, **When** the system checks transaction status, **Then** the transaction status updates to "success" and Airtel Money ID is recorded
3. **Given** a customer has received the disbursement, **When** they check their Airtel Money balance, **Then** the amount is credited to their wallet
4. **Given** a disbursement request with invalid MSISDN format, **When** the system validates the request, **Then** it rejects the request with clear error message before calling Airtel API

---

### User Story 2 - Track Disbursement Status and History (Priority: P2)

A business needs to query the status of disbursements and view historical payout records to reconcile accounts and troubleshoot issues.

**Why this priority**: Essential for operations and support - businesses need visibility into their payouts to handle customer inquiries and reconcile accounts.

**Independent Test**: Can be fully tested by creating disbursements, then querying by transaction ID and listing all disbursements for a tenant to verify status tracking and filtering work correctly.

**Acceptance Scenarios**:

1. **Given** a disbursement was initiated 5 minutes ago, **When** the business queries by transaction ID, **Then** the system returns current status, amount, recipient, and timestamps
2. **Given** a tenant has made 50 disbursements over the past month, **When** they request their disbursement history, **Then** the system returns paginated list with filtering by date range and status
3. **Given** a disbursement failed due to invalid recipient, **When** the business queries the transaction, **Then** the system shows failure reason and error code from Airtel

---

### User Story 3 - Handle Disbursement Failures and Retries (Priority: P3)

When a disbursement fails (e.g., recipient wallet suspended, network timeout), the system provides clear error information and allows retries where appropriate.

**Why this priority**: Important for reliability but not blocking for initial value - businesses can manually retry failed transactions through the API.

**Independent Test**: Can be tested by simulating various failure scenarios (invalid wallet, insufficient balance, network errors) and verifying error handling and retry logic work correctly.

**Acceptance Scenarios**:

1. **Given** Airtel API returns "wallet suspended" error, **When** the disbursement is attempted, **Then** the system records the failure with specific error code and prevents retry
2. **Given** Airtel API times out during disbursement, **When** the system detects the timeout, **Then** it marks transaction as "pending" and allows status check to determine actual result
3. **Given** a disbursement failed due to temporary network issue, **When** the business retries the same transaction ID, **Then** the system checks if original already succeeded before submitting duplicate

---

### User Story 4 - Support Different Wallet Types and Transaction Types (Priority: P3)

Airtel Money supports different wallet types (NORMAL, SALARY, etc.) and transaction types (B2C, B2B). The system allows businesses to specify these for proper routing and compliance.

**Why this priority**: Enables advanced use cases and compliance requirements but not required for basic functionality.

**Independent Test**: Can be tested by sending disbursements to different wallet types and verifying they're routed correctly with appropriate transaction type labels.

**Acceptance Scenarios**:

1. **Given** a business wants to pay employee salary, **When** they specify wallet_type="SALARY" and type="B2B", **Then** the system includes these in Airtel API request
2. **Given** wallet type is not specified, **When** disbursement is requested, **Then** the system defaults to "NORMAL" wallet type
3. **Given** an invalid wallet type is provided, **When** the system validates the request, **Then** it rejects with list of valid wallet types

---

### Edge Cases

- What happens when Airtel API is unavailable during disbursement request?
  - System should record transaction as "pending" with retry flag, return error to client with retry instructions
- What happens when duplicate transaction ID is submitted?
  - System checks database for existing transaction with same ID, returns existing result if found (idempotency)
- What happens when disbursement amount is zero or negative?
  - System rejects request before calling Airtel API
- What happens when MSISDN includes country code despite docs saying not to?
  - System normalizes by stripping country code prefix if detected
- What happens when tenant's Airtel credentials expire during operation?
  - OAuth2 token auto-refresh should handle this; if refresh fails, return authentication error
- What happens when encrypted PIN is invalid or missing?
  - Airtel API returns error; system records failure with specific error code
- What happens when recipient's wallet reaches maximum balance?
  - Airtel returns specific error code; system records failure with reason

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST send disbursements to Airtel Money wallets via Airtel Disbursement API v3.0 endpoint `/standard/v3/disbursements`
- **FR-002**: System MUST validate MSISDN format (no country code, numeric only) before submitting to Airtel
- **FR-003**: System MUST generate unique transaction IDs for each disbursement request to ensure idempotency
- **FR-004**: System MUST store disbursement records with tenant isolation (each tenant sees only their own disbursements)
- **FR-005**: System MUST include OAuth2 bearer token, x-signature, and x-key headers in all Airtel API requests
- **FR-006**: System MUST support encrypted PIN field in disbursement requests as required by Airtel
- **FR-007**: System MUST allow specifying wallet_type (NORMAL, SALARY, etc.) and transaction type (B2C, B2B)
- **FR-008**: System MUST track transaction status (pending, success, failed) and update based on Airtel responses
- **FR-009**: System MUST store Airtel-generated IDs (reference_id, airtel_money_id) for reconciliation
- **FR-010**: System MUST provide endpoint to query disbursement status by transaction ID
- **FR-011**: System MUST provide endpoint to list tenant's disbursement history with pagination and filters
- **FR-012**: System MUST handle Airtel API errors gracefully and return meaningful error messages to clients
- **FR-013**: System MUST prevent duplicate disbursements for the same transaction ID (idempotency)
- **FR-014**: System MUST log all disbursement attempts with request/response details for audit trail
- **FR-015**: System MUST apply rate limiting per tenant to prevent abuse of disbursement endpoint
- **FR-016**: System MUST validate tenant has sufficient balance/permissions before initiating disbursement (if balance tracking implemented)

### Key Entities

- **Disbursement**: A payout transaction from business to customer wallet
  - Attributes: transaction ID, tenant ID, payee MSISDN, amount, currency, wallet type, transaction type, reference, PIN, status, Airtel reference ID, Airtel Money ID, created/updated timestamps, error details
  - Relationships: Belongs to Tenant, may link to original Payment if refund

- **DisbursementStatus**: Enumeration of transaction states
  - Values: PENDING, SUCCESS, FAILED, PROCESSING
  - Used to track lifecycle of disbursement

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Businesses can successfully send money to customer wallets with 95%+ success rate for valid requests
- **SC-002**: Disbursement requests complete (receive initial response from Airtel) within 5 seconds under normal load
- **SC-003**: System accurately tracks and reports disbursement status for 100% of transactions
- **SC-004**: Failed disbursements include specific error codes enabling businesses to take corrective action
- **SC-005**: Duplicate transaction ID submissions return idempotent responses (same result as original) without creating duplicate transfers
- **SC-006**: System maintains complete audit trail of all disbursement attempts for compliance and troubleshooting
- **SC-007**: Multi-tenant isolation prevents any tenant from viewing or modifying another tenant's disbursement records
- **SC-008**: API endpoint handles 100 concurrent disbursement requests from different tenants without errors
