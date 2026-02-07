# Testing Strategy & Guidelines

**Document Version**: 1.0  
**Last Updated**: February 5, 2026  
**Status**: Active Development  
**Coverage Target**: 80% overall, 85%+ on critical services

---

## Overview

This document defines testing standards for the Payment Gateway, covering unit tests, E2E tests, test structure, and coverage requirements.

---

## Testing Pyramid

```
           /\
          /  \         E2E Tests (10-15%)
         /----\        Critical user journeys
        /      \       Integration scenarios
       /--------\
      /          \     Integration Tests (20-25%)
     /            \    Service interactions
    /______________\   Database operations
   /                \
  /                  \ Unit Tests (70-75%)
 /____________________\ Individual functions
                       High coverage, fast
```

---

## Test Types

### Unit Tests (70-75% of tests)

**Purpose**: Test individual functions/methods in isolation

**Characteristics**:
- ✅ Use mocks/stubs for dependencies
- ✅ Test single responsibility principle
- ✅ Run in <1ms per test
- ✅ No database access
- ✅ No HTTP calls
- ✅ Deterministic (no timing dependencies)

**Example**:
```typescript
describe('PaymentsService.create', () => {
  let service: PaymentsService;
  let mockPaymentRepository: Mock<Repository<Payment>>;

  beforeEach(() => {
    mockPaymentRepository = mock(Repository);
    service = new PaymentsService(mockPaymentRepository);
  });

  it('should create a payment with correct status', async () => {
    const dto = generateTestPaymentDto();
    const payment = createMockPayment();
    
    mockPaymentRepository.save.mockResolvedValue(payment);

    const result = await service.create(dto);

    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(mockPaymentRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: dto.tenantId }),
    );
  });
});
```

### Integration Tests (20-25% of tests)

**Purpose**: Test multiple components working together

**Characteristics**:
- ✅ Use real database (test instance)
- ✅ Test API endpoints with real middleware
- ✅ Include authentication/authorization
- ✅ Use factories to create test data
- ✅ Run in <10ms per test
- ✅ Clean up test data after each test

**Example**:
```typescript
describe('PaymentsController (Integration)', () => {
  let app: INestApplication;
  let paymentService: PaymentsService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [PaymentsModule, TypeOrmModule.forRoot(testDbConfig)],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    paymentService = moduleFixture.get(PaymentsService);
  });

  it('POST /api/v1/payments should create payment', async () => {
    const tenantId = generateTestId();
    const dto = generateTestPaymentDto({ tenantId });

    const response = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('x-api-key', testApiKey)
      .set('x-tenant-id', tenantId)
      .send(dto)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toBe(PaymentStatus.PENDING);
  });
});
```

### E2E Tests (5-10% of tests)

**Purpose**: Test complete user workflows

**Characteristics**:
- ✅ Full application stack (real DB, HTTP, etc.)
- ✅ Test from user perspective
- ✅ Include authentication flow
- ✅ Test error scenarios
- ✅ Slower but comprehensive
- ✅ Test multi-tenant scenarios

**Example**:
```typescript
describe('Complete Payment Flow (E2E)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should complete payment flow: create → pending → success', async () => {
    // 1. Create tenant & user
    const tenant = await createTestTenant();
    const user = await createTestUser({ tenantId: tenant.id });
    const apiKey = await generateApiKeyForUser(user);

    // 2. Create payment
    const paymentDto = generateTestPaymentDto();
    const paymentResponse = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${apiKey}`)
      .send(paymentDto)
      .expect(201);

    const paymentId = paymentResponse.body.id;
    expect(paymentResponse.body.status).toBe(PaymentStatus.PENDING);

    // 3. Simulate webhook callback
    await simulateMtnWebhookCallback({
      externalId: paymentDto.externalId,
      status: PaymentStatus.SUCCESSFUL,
    });

    // 4. Verify payment status updated
    const statusResponse = await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(200);

    expect(statusResponse.body.status).toBe(PaymentStatus.SUCCESSFUL);

    // 5. Verify invoice was created
    const invoices = await request(app.getHttpServer())
      .get('/api/v1/invoices')
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(200);

    expect(invoices.body).toContainEqual(
      expect.objectContaining({ paymentId }),
    );
  });
});
```

---

## Coverage Requirements by Service

| Service/Module | Unit Tests | Integration Tests | E2E Tests | Total Target |
|---|---|---|---|---|
| PaymentsService | 80% | 80% | ✅ | 85% |
| CollectionService | 75% | 75% | ✅ | 80% |
| DisbursementService | 75% | 75% | ✅ | 80% |
| ApiKeyGuard | 95% | - | - | 95% |
| AuditService | 85% | 80% | - | 90% |
| TenantService | 85% | 85% | - | 85% |
| AuthService | 80% | 80% | ✅ | 85% |
| UserService | 75% | 75% | - | 80% |
| HealthController | 80% | 80% | - | 80% |

---

## Test File Organization

```
src/
├── modules/
│   ├── payments/
│   │   ├── payments.service.ts
│   │   ├── payments.service.spec.ts          ← Unit tests
│   │   ├── payments.controller.ts
│   │   ├── payments.controller.spec.ts       ← Unit tests
│   │   └── ...
│   ├── audit/
│   │   ├── audit.service.ts
│   │   ├── audit.service.spec.ts             ← Unit tests
│   │   └── ...
│   └── ...
├── common/
│   ├── guards/
│   │   ├── api-key.guard.ts
│   │   └── api-key.guard.spec.ts             ← Unit tests
│   └── ...
└── ...

test/
├── jest-e2e.json                  ← E2E config
├── jest-unit.json                 ← Unit test config
├── jest.setup.ts
├── unit/
│   ├── jest.setup.ts              ← Unit test setup
│   └── test.utils.ts              ← Shared utilities
├── e2e/
│   ├── complete-payment-flow.e2e-spec.ts
│   ├── multi-tenant-isolation.e2e-spec.ts
│   ├── authorization.e2e-spec.ts
│   └── ...
├── factories/
│   ├── payment.factory.ts
│   ├── tenant.factory.ts
│   ├── user.factory.ts
│   └── ...
├── helpers/
│   ├── test-app.helper.ts
│   ├── mock.helpers.ts
│   └── ...
└── database/
    ├── seed.ts                    ← Test data seeding
    └── teardown.ts                ← Cleanup
```

---

## Running Tests

### Run All Tests
```bash
yarn test
```

### Run Unit Tests Only
```bash
yarn test -- --config test/jest-unit.json
```

### Run Unit Tests in Watch Mode
```bash
yarn test:watch
```

### Run Coverage Report
```bash
yarn test:cov
```

### Run Specific Test File
```bash
yarn test -- payments.service.spec.ts
```

### Run E2E Tests
```bash
yarn test:e2e
```

### Run Tests Matching Pattern
```bash
yarn test -- --testNamePattern="should create payment"
```

---

## Writing Unit Tests

### 1. Arrange-Act-Assert Pattern

```typescript
describe('PaymentsService.create', () => {
  it('should create payment with correct status', async () => {
    // ARRANGE: Set up test data and mocks
    const dto = generateTestPaymentDto();
    const mockPayment = createMockPayment();
    mockPaymentRepository.save.mockResolvedValue(mockPayment);

    // ACT: Execute the function
    const result = await service.create(dto);

    // ASSERT: Verify results
    expect(result.status).toBe(PaymentStatus.PENDING);
  });
});
```

### 2. Test Naming Conventions

✅ **Good**:
- `should create payment with PENDING status`
- `should reject invalid API key`
- `should filter audits by tenantId`
- `should throw error when phone number invalid`

❌ **Bad**:
- `test1`
- `works`
- `test payment creation`
- `error`

### 3. Mocking Best Practices

```typescript
// ✅ Mock repositories
const mockPaymentRepository = {
  find: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
};

// ✅ Mock services
const mockCollectionService = {
  requestToPay: jest.fn(),
};

// ✅ Setup return values
mockPaymentRepository.save.mockResolvedValue(mockPayment);
mockCollectionService.requestToPay.mockRejectedValue(new Error('API Error'));

// ✅ Verify calls
expect(mockPaymentRepository.save).toHaveBeenCalledWith(
  expect.objectContaining({ tenantId: 'tenant-123' }),
);

// ❌ Avoid real HTTP calls
// ❌ Avoid real database access
// ❌ Avoid timing dependencies
```

### 4. Testing Tenant Isolation

```typescript
it('should only return payments for specified tenant', async () => {
  const tenantA = generateTestId();
  const tenantB = generateTestId();

  // Create payments for both tenants
  await service.create({ ...dto, tenantId: tenantA });
  await service.create({ ...dto, tenantId: tenantB });

  // Query as Tenant A
  const result = await service.findAll(tenantA);

  // Verify isolation
  assertTenantIsolation(result, tenantA);
  expect(result).not.toContainEqual(
    expect.objectContaining({ tenantId: tenantB }),
  );
});
```

### 5. Error Scenario Testing

```typescript
it('should throw BadRequestException for invalid provider', async () => {
  const dto = generateTestPaymentDto({
    provider: 'INVALID_PROVIDER',
  });

  await expect(service.create(dto)).rejects.toThrow(BadRequestException);
});

it('should handle API timeout gracefully', async () => {
  mockCollectionService.requestToPay.mockRejectedValue(
    new Error('Request timeout'),
  );

  await expect(service.create(dto)).rejects.toThrow();
  
  // Verify payment state is correct
  const payment = await paymentRepository.findOne(paymentId);
  expect(payment.status).toBe(PaymentStatus.FAILED);
});
```

---

## Coverage Quality Guidelines

### What NOT to Test

- ❌ NestJS framework code (decorators, guards already tested)
- ❌ 3rd party library implementations
- ❌ TypeORM query builders (test through services)
- ❌ Environment configuration (test through ConfigService)

### What TO Test

- ✅ Business logic in services
- ✅ API validation in DTOs
- ✅ Authorization/authentication flows
- ✅ Database query results
- ✅ Error handling
- ✅ Edge cases (null, empty, boundary values)

### High-Value Test Cases

1. **Happy Path**: Normal, expected workflow
2. **Error Path**: Known error conditions
3. **Edge Cases**: Boundary values, null checks
4. **Tenant Isolation**: Multi-tenant security
5. **Idempotency**: Duplicate requests handled correctly
6. **Validation**: Invalid inputs rejected

---

## Continuous Integration

### Pre-Commit Hook

```bash
#!/bin/bash
# .husky/pre-commit
yarn lint
yarn test:affected
```

### Pre-Push Hook

```bash
#!/bin/bash
# .husky/pre-push
yarn test
yarn test:cov
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: payment_gateway_test
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: yarn install
      - run: yarn lint
      - run: yarn test
      - run: yarn test:cov
      - run: yarn test:e2e
```

---

## Performance Benchmarks

**Target Test Suite Execution Times**:
- Unit tests: <2 minutes
- Integration tests: <3 minutes
- E2E tests: <5 minutes
- Full suite: <10 minutes

**If tests exceed targets**:
1. Run tests in parallel: `jest --maxWorkers=4`
2. Only run changed tests: `jest --onlyChanged`
3. Skip slow E2E tests locally: `yarn test --testPathIgnorePatterns=e2e`

---

## Debugging Tests

### Run Single Test
```bash
yarn test -- payments.service.spec.ts --testNamePattern="should create payment"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
# Then open chrome://inspect in Chrome
```

### Print Debug Info
```typescript
it('should create payment', async () => {
  const result = await service.create(dto);
  console.log('Result:', JSON.stringify(result, null, 2));
  expect(result).toBeDefined();
});
```

---

## Test Checklist for Pull Requests

Before submitting a PR, verify:

- [ ] All new code has unit tests
- [ ] Unit tests pass locally: `yarn test`
- [ ] E2E tests pass: `yarn test:e2e`
- [ ] Coverage hasn't decreased: `yarn test:cov`
- [ ] No `console.log` or debugging code left in
- [ ] Tests follow naming conventions
- [ ] Tenant isolation tested for multi-tenant features
- [ ] Error scenarios covered
- [ ] No hardcoded test data in main code

---

## Resources

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Best Practices](https://testingjavascript.com/)
- [TDD Approach](https://en.wikipedia.org/wiki/Test-driven_development)

---

**Maintained by**: Backend Team  
**Last Review**: February 5, 2026  
**Next Review**: March 5, 2026
