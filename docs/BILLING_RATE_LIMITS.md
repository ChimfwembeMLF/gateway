# Per-Tenant Billing-Based Rate Limiting

## Overview

The gateway now supports **per-tenant rate limiting based on billing plans**. Each tenant gets rate limits according to their subscription tier (FREE, STANDARD, PREMIUM, ENTERPRISE).

## Rate Limit Tiers

### FREE Plan
- **Requests per Minute**: 50
- **Max Daily Requests**: 5,000
- **Concurrent Requests**: 5
- **Monthly Price**: $0
- **Features**: Basic API access, Community support
- **SLA Uptime**: 99%

### STANDARD Plan
- **Requests per Minute**: 200
- **Max Daily Requests**: 50,000
- **Concurrent Requests**: 25
- **Monthly Price**: $99 ($990/year)
- **Features**: Full API access, Email & chat support, Advanced analytics
- **SLA Uptime**: 99.5%

### PREMIUM Plan
- **Requests per Minute**: 500
- **Max Daily Requests**: 250,000
- **Concurrent Requests**: 100
- **Monthly Price**: $499 ($4,990/year)
- **Features**: Full API access, Priority support, Rate limit customization
- **SLA Uptime**: 99.9%

### ENTERPRISE Plan
- **Requests per Minute**: 2,000
- **Max Daily Requests**: 10,000,000
- **Concurrent Requests**: 500
- **Monthly Price**: $2,499 ($24,990/year)
- **Features**: Unlimited API access, 24/7 phone support, Custom integrations
- **SLA Uptime**: 99.99%

## Architecture

### Components

1. **BillingPlan Entity**
   - Defines plan types with rate limits and features
   - Stored in `billing_plans` table
   - Includes: name, price, requestsPerMinute, maxDailyRequests, features, SLA

2. **TenantBillingSubscription Entity**
   - Links tenants to billing plans
   - Stored in `tenant_billing_subscriptions` table
   - Tracks: active subscriptions, billing frequency, cancellation status, expiration dates

3. **BillingLimitService**
   - Core service for managing rate limits
   - Methods:
     - `getTenantRateLimits(tenantId)` - Get limits for a tenant
     - `getTenantSubscription(tenantId)` - Get current subscription
     - `subscribeTenantToPlan()` - Subscribe tenant to plan
     - `cancelSubscription()` - Cancel subscription
     - `getActivePlans()` - List available plans

4. **TenantThrottlerGuard**
   - Custom guard that replaces default `ThrottlerGuard`
   - Automatically applies per-tenant rate limits
   - Falls back to FREE tier if subscription not found
   - Reads `x-tenant-id` header to identify tenant

## Implementation Flow

```
HTTP Request → TenantThrottlerGuard
                ↓
        Check x-tenant-id header
                ↓
        Query BillingLimitService for tenant's plan
                ↓
        Apply plan-specific rate limits (requestsPerMinute)
                ↓
        If exceeded → 429 Too Many Requests
                ↓
        If OK → Process request normally
```

## Usage

### For API Clients

Include the tenant ID in request headers:

```bash
curl -H "x-tenant-id: <tenant-uuid>" \
     -H "Authorization: Bearer <token>" \
     https://api.gateway.com/payments
```

### For Administrators

#### Subscribe a tenant to a plan:

```typescript
// In your service
await this.billingLimitService.subscribeTenantToPlan(
  tenantId,
  BillingPlanType.PREMIUM,
  'MONTHLY',
  true // auto-renew
);
```

#### Get tenant's current limits:

```typescript
const limits = await this.billingLimitService.getTenantRateLimits(tenantId);
// Returns: { requestsPerMinute: 500, maxDailyRequests: 250000, ... }
```

#### Cancel subscription:

```typescript
await this.billingLimitService.cancelSubscription(subscriptionId, 'Upgrade to enterprise');
```

## Database Schema

### billing_plans table

```sql
CREATE TABLE billing_plans (
  id UUID PRIMARY KEY,
  type ENUM('FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE') UNIQUE,
  name VARCHAR(100),
  description TEXT,
  monthlyPrice DECIMAL(10, 2),
  yearlyPrice DECIMAL(10, 2),
  requestsPerMinute INT,
  maxDailyRequests INT,
  maxConcurrentRequests INT,
  features JSONB,
  supportTier VARCHAR(50),
  slaUptime DECIMAL(5, 2),
  isActive BOOLEAN,
  priority INT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

### tenant_billing_subscriptions table

```sql
CREATE TABLE tenant_billing_subscriptions (
  id UUID PRIMARY KEY,
  tenantId UUID REFERENCES tenants(id) ON DELETE CASCADE,
  billingPlanId UUID REFERENCES billing_plans(id),
  startDate TIMESTAMP,
  expiresAt TIMESTAMP,
  billingFrequency VARCHAR(50),
  autoRenew BOOLEAN,
  amountPaid DECIMAL(10, 2),
  isActive BOOLEAN,
  cancellationReason TEXT,
  cancelledAt TIMESTAMP,
  notes TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);

CREATE INDEX idx_tenant_billing_subscriptions_tenantId_isActive 
ON tenant_billing_subscriptions(tenantId, isActive);

CREATE INDEX idx_tenant_billing_subscriptions_tenantId_expiresAt 
ON tenant_billing_subscriptions(tenantId, expiresAt);
```

## Seeding Default Plans

Default plans are automatically seeded when the application starts:

```typescript
// In src/modules/billing/seeders/billing-plan.seeder.ts
const plans = [
  { type: 'FREE', name: 'Free', ... },
  { type: 'STANDARD', name: 'Standard', ... },
  { type: 'PREMIUM', name: 'Premium', ... },
  { type: 'ENTERPRISE', name: 'Enterprise', ... }
];
```

Run seeder:

```bash
npm run seed:billing
# or manually in your boot process
```

## Rate Limit Error Handling

When a tenant exceeds their rate limit:

```json
HTTP/1.1 429 Too Many Requests
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests",
  "error": "Too Many Requests"
}
```

Include rate limit info in response headers (future enhancement):

```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 245
X-RateLimit-Reset: 1707000000
```

## Future Enhancements

1. **Dynamic Rate Limit Adjustment**
   - Allow admins to customize limits per tenant
   - Burst allowance for peak traffic

2. **Usage Metering**
   - Track daily/monthly usage
   - Alert when approaching limits
   - Auto-downgrade on overuse

3. **Rate Limit Headers**
   - Return remaining requests in response headers
   - Show reset time

4. **Tiered Pricing**
   - Pay-per-use beyond included limits
   - Overage charges and notifications

5. **Circuit Breaker**
   - Disable requests for delinquent accounts
   - Soft/hard caps

6. **Analytics Dashboard**
   - Per-tenant usage visualization
   - Billing history and invoices

## Configuration

Adjust global throttler settings in `.env`:

```bash
# Global fallback limits (used when tenant not found)
THROTTLE_TTL=60000          # Time window in ms
THROTTLE_LIMIT=100          # Max requests per TTL
```

Default limits can be overridden per endpoint:

```typescript
@Post('payments')
@Throttle({ default: { limit: 10, ttl: 60000 } })
createPayment() { }
```

## Security Considerations

- Tenant ID must be validated before rate limiting
- Ensure tenant ID comes from authenticated user context
- Rate limit keys include IP to prevent bypass with same tenant
- Failed lookups default to FREE tier (fail-safe)
- Throttler logs all rate limit violations for audit trail
