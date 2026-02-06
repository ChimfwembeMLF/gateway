# Mobile Admin Dashboard Specification

**Feature ID**: 004-mobile-admin-dashboard  
**Status**: Specification  
**Created**: February 6, 2026  
**Last Updated**: February 6, 2026

---

## Overview

A native mobile application (iOS and Android) that enables payment gateway tenants and administrators to manage disbursements, monitor invoices, track payments, and receive real-time notifications on the go. The app provides a simplified, touch-optimized interface for critical business operations while maintaining full security and multi-tenant isolation.

### Key Features

- ✅ Real-time disbursement tracking and status monitoring
- ✅ Invoice and payment history with search/filter
- ✅ Push notifications for transaction events and alerts
- ✅ Secure authentication (biometric + PIN + JWT)
- ✅ Offline data access and transaction queuing
- ✅ Revenue dashboard with key metrics
- ✅ User role-based access control (Admin, Operator, Viewer)
- ✅ Multi-currency support
- ✅ Transaction receipt generation and sharing

---

## User Scenarios & Testing

### Scenario 1: Tenant Admin Monitors Disbursements

**Actor**: Payment gateway tenant administrator  
**Goal**: Track disbursement status and identify failed transactions  

**Steps**:
1. User opens app and logs in with biometric authentication
2. App displays dashboard with active disbursements and failed transactions
3. User taps on "Failed Disbursements" to see details
4. App shows failed transaction reason and recommended action
5. User initiates retry or contacts support
6. App confirms action and shows updated status

**Testing**:
- Verify app displays correct disbursement counts by status (pending, completed, failed)
- Verify app retrieves data within 3 seconds on 4G network
- Verify failed transaction reasons match backend API responses
- Verify retry action properly queued if offline

---

### Scenario 2: Operator Receives Payment Reminder Alert

**Actor**: Payment gateway operator  
**Goal**: Act on overdue invoices  

**Steps**:
1. User receives push notification: "Invoice #INV-001 overdue by 5 days"
2. User taps notification and app opens to invoice details
3. App shows invoice amount, due date, and payment status
4. User initiates reminder email to customer (or marks paid)
5. App syncs action to backend
6. App returns to dashboard with updated status

**Testing**:
- Verify push notification delivery within 5 seconds of backend event
- Verify notification includes invoice amount and due date
- Verify deep link opens correct invoice details screen
- Verify offline queuing of actions (email/mark-paid) until sync

---

### Scenario 3: Admin Views Revenue Analytics

**Actor**: Tenant finance administrator  
**Goal**: Understand payment and disbursement trends  

**Steps**:
1. User opens "Analytics" tab
2. App displays key metrics (total invoiced, collected, disbursed this month)
3. User selects date range (last 30 days, this quarter, custom)
4. App displays charts showing payment trends and success rates
5. User exports report or shares screenshot
6. App returns to dashboard

**Testing**:
- Verify metrics match backend calculations (within 1 second of last sync)
- Verify charts render correctly on different screen sizes
- Verify date range filters work and refresh data
- Verify export generates valid PDF or CSV file

---

### Scenario 4: User Logs In with Forgotten Password

**Actor**: Any authenticated user  
**Goal**: Regain access to account  

**Steps**:
1. User taps "Forgot Password?" on login screen
2. App prompts for email or username
3. User enters credentials
4. App sends password reset link to registered email
5. User receives email with reset link
6. User taps link and creates new password
7. App automatically logs user in

**Testing**:
- Verify password reset email sent within 30 seconds
- Verify reset link expires after 24 hours
- Verify new password meets security requirements
- Verify session created after successful reset

---

### Scenario 5: Offline Transaction Sync

**Actor**: Mobile operator in low connectivity area  
**Goal**: Complete transaction actions despite network interruption  

**Steps**:
1. User is in area with poor/no connectivity
2. User marks invoice as paid (app queues action locally)
3. App shows "Syncing..." indicator
4. User navigates away and returns to dashboard later
5. When connectivity restored, app syncs queued actions automatically
6. App confirms sync completion and removes indicators

**Testing**:
- Verify actions queued locally when offline
- Verify queue persists across app restarts
- Verify automatic sync when connectivity restored
- Verify conflict resolution if action fails on backend

---

## Functional Requirements

### Authentication & Security

**FR-001**: Users MUST authenticate using one of three methods:
- Biometric (Face ID / Touch ID / fingerprint)
- PIN (6-digit numeric code)
- Temporary session token (if biometric disabled)

**FR-002**: App MUST enforce session timeout of 15 minutes of inactivity, after which user must re-authenticate

**FR-003**: App MUST NOT store sensitive data (passwords, API keys, tokens) in device storage; use secure enclave/keychain only

**FR-004**: App MUST support JWT token refresh without requiring user re-authentication (background refresh)

**FR-005**: App MUST validate API key (x-api-key header) from secure storage before each API call

**FR-006**: App MUST implement certificate pinning to prevent man-in-the-middle attacks on API calls

**FR-007**: App MUST provide option to logout, which clears all cached data and tokens

---

### Dashboard & Home Screen

**FR-008**: Dashboard MUST display summary cards with:
- Total active disbursements (count)
- Total invoices awaiting payment (count and amount)
- Total collected this month (amount in tenant's currency)
- Success rate of last 100 transactions (percentage)

**FR-009**: Dashboard MUST display two lists below summary cards:
- "Recent Transactions" (last 10 in reverse chronological order)
- "Pending Actions" (invoices awaiting payment, failed transactions)

**FR-010**: Dashboard MUST refresh data automatically every 30 seconds when app is in foreground; pause when backgrounded

**FR-011**: Dashboard MUST support pull-to-refresh gesture to manually sync latest data

**FR-012**: Each transaction in list MUST show:
- Transaction ID / Invoice number
- Amount and currency
- Status (with color coding: green=completed, red=failed, yellow=pending)
- Timestamp (relative: "2 hours ago" or absolute: "Feb 6, 10:30 AM")
- Recipient (for disbursements) or Payer (for invoices)

---

### Disbursement Management

**FR-013**: User MUST be able to view disbursement details including:
- Disbursement ID (internal and external)
- Amount and currency
- Status with detailed reason (if failed)
- Recipient details (account, bank, address)
- Timestamps (created, completed, failed)
- Payment provider used (MTN, Airtel, etc.)
- All previous status changes (audit trail)

**FR-014**: User MUST be able to filter disbursements by:
- Status (all, pending, completed, failed)
- Date range (last 7 days, last 30 days, custom)
- Provider (all, MTN, Airtel)
- Amount range (optional)

**FR-015**: User with Admin role MUST be able to:
- Retry failed disbursement (if supported by provider)
- Cancel pending disbursement (if cancellable)
- Add internal note to disbursement

**FR-016**: App MUST display estimated processing time for pending disbursements based on provider SLA

**FR-017**: App MUST queue disbursement actions locally when offline and sync when connectivity restored

---

### Invoice Management

**FR-018**: User MUST be able to view invoice details including:
- Invoice ID
- Amount, currency, due date
- Recipient email and payment status
- Payment history (if paid)
- Reminder history (count of reminders sent)

**FR-019**: User MUST be able to filter invoices by:
- Status (all, paid, unpaid, overdue)
- Date range
- Amount range

**FR-020**: User with Operator role MUST be able to:
- Send payment reminder email to customer
- Mark invoice as paid (manual correction)
- Download invoice PDF

**FR-021**: App MUST display invoice status with visual indicator:
- Green: Paid
- Red: Overdue (past due date)
- Yellow: Due soon (within 3 days)
- Gray: Cancelled

**FR-022**: App MUST show payment history with provider details and timestamps when invoice is paid

---

### Notifications

**FR-023**: App MUST request user permission for push notifications on first launch

**FR-024**: App MUST deliver push notifications for:
- Disbursement completed (within 10 seconds of event)
- Disbursement failed (within 10 seconds of event)
- Invoice payment received (within 30 seconds of event)
- Invoice overdue (once per day if still overdue)
- Invoice reminder sent (optional, configurable per user)

**FR-025**: Push notification MUST include:
- Notification type/emoji
- Amount and currency
- Key identifier (transaction ID or invoice number)
- Timestamp or relative time ("just now", "2 minutes ago")

**FR-026**: Tapping notification MUST deep-link to relevant details screen (disbursement or invoice)

**FR-027**: User MUST be able to configure notification preferences:
- Enable/disable by event type
- Quiet hours (e.g., 9 PM to 7 AM)
- Email alternatives (receive notification via email instead of push)

**FR-028**: App MUST display notification history screen showing all notifications from last 30 days

---

### Analytics & Reports

**FR-029**: Analytics dashboard MUST display key metrics:
- Total invoiced this month
- Total collected this month
- Collection rate (collected / invoiced percentage)
- Total disbursed this month
- Average transaction amount
- Success rate (successful / total percentage)

**FR-030**: User MUST be able to filter metrics by date range:
- Last 7 days
- Last 30 days
- This quarter
- This year
- Custom range

**FR-031**: Charts MUST display trends as:
- Daily collections (bar chart)
- Cumulative revenue (line chart)
- Payment methods breakdown (pie chart)
- Disbursement success rate (line chart)

**FR-032**: User MUST be able to export analytics as:
- PDF report (with date range and metrics)
- CSV file (raw data for spreadsheet analysis)

**FR-033**: User MUST be able to share analytics (screenshot, email PDF) via native share sheet

---

### User Management

**FR-034**: App MUST display user profile screen with:
- Username and email
- Role (Admin / Operator / Viewer)
- Tenant name
- Login history (last 10 logins with timestamp and IP)

**FR-035**: User with Admin role MUST be able to:
- View team members (other authenticated users for this tenant)
- View activity log (actions taken by all users in last 30 days)

**FR-036**: User MUST be able to update profile:
- Change password (requires biometric re-authentication)
- Update phone number for notifications

**FR-037**: User MUST be able to view settings:
- Notification preferences (configured in FR-027)
- App theme (light/dark mode)
- Language (if multi-language supported)

---

### Search & Filtering

**FR-038**: App MUST provide search functionality on:
- Transactions tab: search by transaction ID, invoice number, recipient name, amount
- Invoices tab: search by invoice ID, customer email, amount range
- Activity tab: search by user name, action type, date range

**FR-039**: Search results MUST appear within 1 second of user stopping typing

**FR-040**: Search MUST support partial matches (e.g., "john" matches "john@example.com")

**FR-041**: Search results MUST be sortable by:
- Relevance (default)
- Date (newest first)
- Amount (highest first)

---

### Offline & Sync

**FR-042**: App MUST cache following data locally for offline access:
- Transactions from last 30 days
- Invoices from last 90 days
- User profile
- Basic settings

**FR-043**: App MUST queue following actions locally when offline:
- Mark invoice as paid
- Send payment reminder
- Retry disbursement
- Add internal notes

**FR-044**: Queued actions MUST persist across app restarts

**FR-045**: When connectivity restored, app MUST:
- Automatically sync queued actions in background
- Notify user if sync successful or failed
- Resolve conflicts (e.g., invoice marked paid but actually already paid)

**FR-046**: User MUST be able to manually trigger sync using "Pull to Refresh" or "Sync" button

**FR-047**: App MUST display last sync timestamp on dashboard

---

### Accessibility

**FR-048**: App MUST support:
- Dynamic text sizing (respects OS font size settings)
- High contrast mode
- Screen reader accessibility (VoiceOver / TalkBack)
- Voice control (Siri / Google Assistant integration)

**FR-049**: All interactive elements MUST have minimum 44x44 point touch target size

**FR-050**: All images MUST include alt text for screen readers

**FR-051**: Color MUST NOT be the only indicator of status (use text labels + icons)

---

### Localization

**FR-052**: App MUST support multiple languages:
- English
- Swahili (primary market)
- [Additional languages per tenant requirements]

**FR-053**: Currency display MUST follow user's locale settings

**FR-054**: Date and time formatting MUST respect user's locale (e.g., DD/MM/YYYY vs MM/DD/YYYY)

---

## Success Criteria

### Performance

**SC-001**: App MUST load home screen within 2 seconds on 4G network (median device)

**SC-002**: API calls MUST complete within 5 seconds on 4G; show loading indicator if slower

**SC-003**: Search results MUST display within 1 second of last keystroke

**SC-004**: Push notifications MUST be delivered within 10 seconds of backend event (disbursement/invoice)

**SC-005**: Pull-to-refresh MUST complete within 3 seconds on 4G

**SC-006**: Offline sync MUST queue and process actions without user perceiving lag

---

### Reliability

**SC-007**: App crash rate MUST be below 0.5% (crashes per 1,000 sessions)

**SC-008**: Session timeout MUST work correctly 99.9% of the time

**SC-009**: Biometric authentication MUST succeed 99% of the time (excluding failed user attempts)

**SC-010**: Data sync MUST succeed 99.5% of the time; retry failed syncs up to 3 times

**SC-011**: Offline data availability MUST be 99% (cached data accessible 99% of the time app is used offline)

---

### Security

**SC-012**: Zero successful security breaches or unauthorized data access attempts

**SC-013**: All API communication MUST use HTTPS with certificate pinning

**SC-014**: Biometric data MUST NOT be accessible to app; only pass/fail result used

**SC-015**: Session tokens MUST be stored in secure enclave/keychain, not readable by other apps

**SC-016**: Password reset tokens MUST expire after 24 hours

**SC-017**: Failed login attempts MUST trigger lockout after 5 consecutive failures (15 min lockout)

---

### User Experience

**SC-018**: New user onboarding MUST complete in under 5 minutes

**SC-019**: Task completion rate (users successfully completing intended action) MUST exceed 95%

**SC-020**: User retention rate (users returning after 1 month) MUST exceed 70%

**SC-021**: App store rating MUST be 4.0+ stars on both iOS and Android

**SC-022**: User satisfaction with notification timing MUST exceed 85% (survey)

**SC-023**: 90% of users MUST complete at least one transaction action per week

---

### Business

**SC-024**: Reduce time to resolve failed transaction from 4 hours to 15 minutes (via app visibility)

**SC-025**: Increase payment collection rate by 10% (via timely reminders)

**SC-026**: Support 10,000 concurrent app users without API performance degradation

**SC-027**: Reduce support tickets related to transaction status by 40%

---

## Key Entities

### User
- `id`: UUID
- `tenantId`: UUID (tenant scoping)
- `email`: string (unique within tenant)
- `displayName`: string
- `role`: enum (Admin | Operator | Viewer)
- `phone`: string (optional)
- `biometricEnabled`: boolean
- `lastLogin`: timestamp
- `createdAt`: timestamp

### Tenant
- `id`: UUID
- `name`: string
- `logo`: URL
- `currency`: ISO 4217 code (e.g., ZMW)
- `timezone`: IANA timezone identifier
- `notificationSettings`: object
- `createdAt`: timestamp

### Transaction
- `id`: UUID (internal)
- `externalId`: string (provider reference)
- `tenantId`: UUID
- `type`: enum (disbursement | invoice)
- `amount`: decimal
- `currency`: ISO 4217 code
- `status`: enum (pending | completed | failed)
- `statusReason`: string (if failed)
- `provider`: string (MTN | Airtel | etc.)
- `timestamp`: timestamp
- `metadata`: JSON (recipient, payer, notes)

### PushNotification
- `id`: UUID
- `userId`: UUID
- `tenantId`: UUID
- `type`: enum (disbursement_completed | disbursement_failed | invoice_payment | invoice_overdue)
- `relatedTransactionId`: UUID
- `title`: string
- `body`: string
- `delivered`: boolean
- `deliveredAt`: timestamp
- `createdAt`: timestamp

---

## Assumptions

1. **Backend API Available**: Full REST API endpoints available per gateway specification (002-airtel-disbursement)
2. **Mobile Operating Systems**: Target iOS 14+ and Android 10+ (covers ~95% of active devices)
3. **Network Connectivity**: Users have intermittent to regular mobile connectivity (3G/4G/5G); offline support essential
4. **Device Hardware**: Modern smartphones with biometric capabilities (Face ID, Touch ID, fingerprint); fallback to PIN
5. **User Base**: Primary users are business admins and operators (tech-comfortable); secondary are viewers
6. **Data Volume**: Average tenant has <100K transactions and <50K invoices annually
7. **Multi-Language Scope**: Initial launch English + Swahili; expansion to other languages in future
8. **Timezone Handling**: Backend provides timestamps in UTC; app converts to user's locale
9. **Push Notification Service**: Firebase Cloud Messaging (FCM) available and configured
10. **App Distribution**: iOS via Apple App Store, Android via Google Play Store
11. **Support Model**: In-app help/FAQs; support requests route to backend helpdesk
12. **Compliance**: GDPR compliant (users can request data export/deletion); local privacy laws respected

---

## Constraints

### Technical

- **App Size**: iOS app <100 MB, Android app <120 MB (uncompressed)
- **Minimum OS**: iOS 14+, Android 10+
- **Network**: Must function on 3G+ (min 1 Mbps)
- **Storage**: Requires minimum 50 MB free device storage
- **Battery**: Must not significantly increase device battery consumption (target <5% during 1 hour use)

### Business

- **Launch Timeline**: MVP in 4 months (2 iOS + 2 Android engineers)
- **Budget**: Estimated $200K-300K for development and first-year support
- **Maintenance**: Ongoing support required (OS updates, security patches)
- **Data Residency**: Comply with local regulations (if applicable)

---

## Out of Scope

- Payment processing directly from mobile app (PCI compliance too complex for MVP)
- Video call support for customer service
- Cryptocurrency payments
- Advanced ML-based fraud detection (future phase)
- Offline transaction creation (only actions on existing transactions)
- Multi-tenant switching (users authenticate to single tenant)

---

## Architecture (Technology-Agnostic)

```
┌─────────────────────────────────────────────────────┐
│         Mobile Application (iOS + Android)          │
│                                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │        Presentation Layer                    │   │
│  │  • Screens (Dashboard, Transactions, etc.)   │   │
│  │  • UI Components & Navigation                │   │
│  │  • Push Notification Handlers                │   │
│  └─────────────────────────────────────────────┘   │
│                        ↕                             │
│  ┌─────────────────────────────────────────────┐   │
│  │        Business Logic Layer                  │   │
│  │  • Authentication (Biometric, PIN, JWT)      │   │
│  │  • Offline/Online State Management           │   │
│  │  • Data Validation & Formatting              │   │
│  │  • Sync Queue Management                     │   │
│  └─────────────────────────────────────────────┘   │
│                        ↕                             │
│  ┌─────────────────────────────────────────────┐   │
│  │        Data Layer                            │   │
│  │  • Local SQLite Database (for caching)       │   │
│  │  • Secure Keychain/Enclave (tokens)          │   │
│  │  • Sync Queue (local actions)                │   │
│  │  • Push Notification Cache                   │   │
│  └─────────────────────────────────────────────┘   │
│                        ↕                             │
│  ┌─────────────────────────────────────────────┐   │
│  │        Network Layer                         │   │
│  │  • HTTPS with Certificate Pinning            │   │
│  │  • Retry Logic & Exponential Backoff         │   │
│  │  • Request/Response Logging (in dev)         │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                         ↕
         ┌────────────────────────────────────┐
         │   Backend API Gateway              │
         │  (002-airtel-disbursement spec)    │
         │                                    │
         │  • REST endpoints for all entities │
         │  • Authentication (JWT + API keys) │
         │  • Push notification service       │
         │  • Audit logging                   │
         └────────────────────────────────────┘
                         ↕
         ┌────────────────────────────────────┐
         │   External Services                │
         │  • Push Notification Provider      │
         │  • Email Service                   │
         │  • Payment Providers (MTN, Airtel) │
         └────────────────────────────────────┘
```

### Data Flow: User Action to Sync

```
User Action          Local Queue          Backend Sync
    ↓                    ↓                      ↓
[Mark as Paid]  →  [Queue Action]  →  [Retry Logic]
    ↓                    ↓                      ↓
[Show Loading]    [Check Network]    [Exponential Backoff]
    ↓                    ↓                      ↓
[Optimistic UI]   [Queue Persists]    [Success/Failure]
    ↓                    ↓                      ↓
[User Continues]  [Auto Sync When]    [Update Local Data]
                  [Connected]         [Notify User]
```

---

## Roadmap

### Phase 1: MVP (Months 1-4)
- ✅ iOS and Android apps with core features
- ✅ Dashboard, transactions, invoices, push notifications
- ✅ Offline support with sync queue
- ✅ Biometric + PIN authentication
- ✅ Basic analytics

### Phase 2: Enhanced (Months 5-7)
- Transaction search and advanced filtering
- Activity log and audit trail viewing
- Notification history and preferences management
- Performance optimizations

### Phase 3: Analytics (Months 8-10)
- Advanced analytics with charts and trends
- Custom report generation
- Data export (PDF/CSV)
- Performance analysis tools

### Phase 4: Team Management (Months 11-12)
- Multi-user team management (by Admin)
- Role-based access control refinement
- Team activity analytics
- Batch operations

### Phase 5: Advanced (Year 2+)
- Integration with additional payment providers
- AI-powered alerts and anomaly detection
- Voice-activated actions (Siri/Google Assistant)
- Wearable app support (Apple Watch, Wear OS)
- Video support for customer service escalation

---

## Success Metrics (Post-Launch)

1. **Adoption**: 30% of active tenants have at least one user with app installed by month 6
2. **Daily Active Users**: 500+ DAU by month 6, growing 10% MoM
3. **Session Duration**: Average session 3-5 minutes
4. **Feature Usage**: 85%+ of users take at least one action per week
5. **Retention**: 60%+ of day-1 users return after 30 days
6. **Support Impact**: 30% reduction in support tickets within 3 months
7. **Rating**: Maintain 4.0+ stars on both app stores
8. **Performance**: 99%+ API availability from app perspective

---

## Approval & Sign-Off

- **Product Owner**: [To be assigned]
- **Engineering Lead**: [To be assigned]
- **Security Review**: [Pending]
- **Compliance Review**: [Pending]

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-06 | AI Assistant | Initial specification |

