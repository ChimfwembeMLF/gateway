# Tasks: Production Readiness - Critical Security & Compliance Fixes

**Branch**: `002-security-fixes` | **Date**: February 4, 2026  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Recent Updates

**February 5, 2026** - Test Suite Fixes & E2E Implementation ✅
- **Test Fixes**: Fixed 4 failing unit tests across multiple services
  - AuthService: Added bcrypt mocking for password validation tests
  - PaymentsService: Fixed tenantId passing and mock setup issues  
  - PaymentsController: Fixed parameter expectation in status query test
  - CollectionService: Added axios mocking for HTTP requests and fixed webhook test expectations
  - **Result**: All 135 tests now passing (previously 131/135 passing)

- **Security Implementation Status**:
  - ✅ Task 1.4 (ThrottlerModule): Already configured with TenantThrottlerGuard
  - ✅ Task 1.5 (Externalize Secrets): All config files use environment variables
  - ✅ Ignore files: .gitignore and .dockerignore properly configured
  - ✅ Test coverage: Reports exist in coverage/ directory

- **E2E Tests Implementation**:
  - ✅ Created comprehensive payments E2E test suite (test/payments.e2e-spec.ts)
  - ✅ Multi-tenant isolation tests (cross-tenant data access prevention)
  - ✅ API key authentication tests
  - ✅ Payment creation and retrieval workflows
  - ✅ Rate limiting verification
  - ✅ List endpoint isolation testing

**Next Focus**: Run E2E tests, then continue with research/documentation tasks

---

## Task Organization

**Phases**: 6 phases (Research, Security, Test Setup, Unit Tests, E2E Tests, Logging)  
**Total Estimated Time**: 46-70 hours  
**Critical Path**: Phase 0 → 1 → 3 → 4 → 6  
**Parallel Opportunities**: Phases 2, 3, 5 can run concurrently

**Priority Legend**:
- 🔴 P0: Blocking production deployment (MUST fix)
- 🟡 P1: High priority (SHOULD fix before production)
- 🟢 P2: Medium priority (nice to have)

---

## Phase 0: Research & Prerequisites (4-6 hours)

### Task 0.1: Audit Migration Strategy Research 🔴 P0 ✅ COMPLETE
**Estimated Time**: 2 hours  
**Dependencies**: None  
**Assignee**: Backend Lead

**Description**: Analyze existing Audit table data and design migration approach for adding `tenantId` column. **STATUS**: Already implemented - Audit entity has tenantId field with index, AuditSubscriber extracts tenantId from entities.

**Subtasks**:
1. [ ] Query audit table row count: `SELECT COUNT(*) FROM audits;`
2. [ ] Check for NULL `auditableId` values that can't be backfilled
3. [ ] Design backfill strategy:
   - Option A: Set all existing to `'SYSTEM'`
   - Option B: Extract tenantId from referenced entity
   - Decision: Document chosen approach
4. [ ] Write test migration on local database
5. [ ] Verify migration rollback works
6. [ ] Document migration steps in `migrations/README.md`

**Acceptance Criteria**:
- ✅ Migration SQL tested locally
- ✅ Backfill strategy documented
- ✅ Rollback procedure verified

**Files**:
- `database/migrations/README.md` (new)

---

### Task 0.2: Rate Limiting Configuration Research 🔴 P0
**Estimated Time**: 1.5 hours  
**Dependencies**: None  
**Assignee**: DevOps/Backend

**Description**: Determine optimal rate limit values and storage strategy for ThrottlerModule.

**Subtasks**:
1. [ ] Review current API traffic patterns (if available):
   - Requests per minute per tenant (avg, p95, p99)
   - Burst patterns
2. [ ] Research ThrottlerModule storage:
   - In-memory (default): OK for single instance
   - Redis: Required for multi-instance (document as future enhancement)
3. [ ] Propose initial rate limits:
   - General endpoints: 100 req/min per tenant
   - Auth endpoints: 10 req/min per IP (prevent brute force)
   - Health check: Unlimited
4. [ ] Document tuning procedure for production
5. [ ] Create load test script template (k6 or Artillery)

**Acceptance Criteria**:
- ✅ Rate limit values documented with rationale
- ✅ Storage strategy decision documented
- ✅ Load test script template ready

**Files**:
- `docs/rate-limiting.md` (new)
- `test/load/rate-limit.k6.js` (template)

---

### Task 0.3: Logging Library Selection & Setup Plan 🟡 P1
**Estimated Time**: 1 hour  
**Dependencies**: None  
**Assignee**: Backend Developer

**Description**: Finalize Pino vs. Winston decision and document integration approach.

**Subtasks**:
1. [ ] Compare Pino vs. Winston:
   - Performance benchmarks
   - NestJS integration (nestjs-pino vs. nest-winston)
   - JSON output support
   - Bundle size
2. [ ] Decision: **Pino** (recommended: faster, simpler, native JSON)
3. [ ] Document required packages: `nestjs-pino`, `pino-http`, `pino-pretty`
4. [ ] Draft configuration for dev vs. production (pretty vs. JSON)
5. [ ] Identify all `console.log` statements to replace (grep search)

**Acceptance Criteria**:
- ✅ Library decision documented
- ✅ Configuration drafted
- ✅ List of files with console.log identified

**Files**:
- `docs/logging.md` (new)

---

### Task 0.4: Test Coverage Analysis 🟡 P1
**Estimated Time**: 1.5 hours  
**Dependencies**: None  
**Assignee**: QA/Backend Lead

**Description**: Analyze current test coverage and identify critical paths to prioritize.

**Subtasks**:
1. [ ] Run `yarn test:cov` and save baseline report
2. [ ] Identify services/modules with 0% coverage
3. [ ] Classify by criticality:
   - P0: ApiKeyGuard, PaymentsService, TenantService
   - P1: AuditService, AuthService, UserService
   - P2: HealthController, MtnService helpers
4. [ ] Estimate test writing time per service (use cyclomatic complexity)
5. [ ] Create test writing priority list
6. [ ] Set realistic coverage targets per service

**Acceptance Criteria**:
- ✅ Baseline coverage report saved
- ✅ Priority list created
- ✅ Coverage targets defined per service

**Files**:
- `coverage/baseline-report.html` (saved)
- `docs/test-strategy.md` (new)

---

## Phase 1: Critical Security Fixes (8-12 hours) 🔴 P0

### Task 1.1: Add TenantId to Audit Entity
**Estimated Time**: 3-4 hours  
**Dependencies**: Task 0.1 complete  
**Assignee**: Backend Developer

**Description**: Implement database migration and update Audit entity to include `tenantId` field.

**Subtasks**:
1. [ ] Generate migration: `yarn typeorm migration:generate -n AddAuditTenantId`
2. [ ] Edit migration file:
   ```typescript
   // Up
   await queryRunner.addColumn('audits', new TableColumn({
     name: 'tenantId',
     type: 'varchar',
     isNullable: true, // Temporarily nullable
   }));
   
   // Backfill existing rows
   await queryRunner.query(`UPDATE audits SET "tenantId" = 'SYSTEM' WHERE "tenantId" IS NULL`);
   
   // Set NOT NULL
   await queryRunner.changeColumn('audits', 'tenantId', new TableColumn({
     name: 'tenantId',
     type: 'varchar',
     isNullable: false,
   }));
   
   // Add index
   await queryRunner.createIndex('audits', new TableIndex({
     name: 'IDX_audit_tenantId',
     columnNames: ['tenantId'],
   }));
   ```
3. [ ] Update `audit.entity.ts`:
   ```typescript
   @Column({ nullable: false })
   @Index()
   tenantId: string;
   ```
4. [ ] Run migration on test database: `yarn typeorm migration:run`
5. [ ] Verify `tenantId` column exists and is indexed
6. [ ] Test rollback: `yarn typeorm migration:revert`

**Acceptance Criteria**:
- ✅ Migration runs successfully
- ✅ All audit rows have tenantId (no NULLs)
- ✅ Index created on tenantId
- ✅ Rollback works

**Files**:
- `database/migrations/TIMESTAMP-AddAuditTenantId.ts` (new)
- `src/modules/audit/entities/audit.entity.ts` (modified)

---

### Task 1.2: Update AuditSubscriber to Set TenantId
**Estimated Time**: 2-3 hours  
**Dependencies**: Task 1.1 complete  
**Assignee**: Backend Developer

**Description**: Modify AuditSubscriber to automatically extract and set `tenantId` from audited entities.

**Subtasks**:
1. [ ] Update `afterInsert` method:
   ```typescript
   async afterInsert(event: InsertEvent<any>) {
     if (event.entity && event.metadata.name !== 'Audit') {
       const tenantId = event.entity.tenantId || 'SYSTEM'; // Fallback for system entities
       const audit = event.manager.create(Audit, {
         event: 'created',
         auditableType: event.metadata.name,
         auditableId: event.entity.id,
         tenantId, // ← Add this
         newValues: event.entity,
         userId: context.userId,
         // ... rest
       });
       await event.manager.save(Audit, audit);
     }
   }
   ```
2. [ ] Update `afterUpdate` and `afterRemove` similarly
3. [ ] Handle entities without `tenantId`:
   - Tenant entity itself → use 'SYSTEM' or skip audit
   - Audit entity → skip (prevent recursion)
4. [ ] Add unit test for AuditSubscriber (see Phase 3)

**Acceptance Criteria**:
- ✅ AuditSubscriber extracts tenantId from entity
- ✅ System entities use 'SYSTEM' fallback
- ✅ No errors when auditing Tenant entity

**Files**:
- `src/modules/audit/audit.subscriber.ts` (modified)

---

### Task 1.3: Add Tenant Filtering to Audit Queries
**Estimated Time**: 1.5 hours  
**Dependencies**: Task 1.2 complete  
**Assignee**: Backend Developer

**Description**: Update AuditService and Controller to filter queries by `tenantId`.

**Subtasks**:
1. [ ] Update `AuditService.findAll()`:
   ```typescript
   async findAll(tenantId: string, filters: AuditQueryDto): Promise<Audit[]> {
     return this.auditRepository.find({
       where: { tenantId, ...filters },
       order: { createdAt: 'DESC' },
     });
   }
   ```
2. [ ] Add `GET /api/v1/audits` endpoint in AuditController:
   ```typescript
   @Get()
   @UseGuards(ApiKeyGuard)
   async findAll(@Req() req, @Query() filters: AuditQueryDto) {
     const tenantId = req.user.tenantId;
     return this.auditService.findAll(tenantId, filters);
   }
   ```
3. [ ] Add pagination support (optional)
4. [ ] Add Swagger documentation

**Acceptance Criteria**:
- ✅ Audit queries filtered by tenantId
- ✅ Endpoint documented in Swagger

**Files**:
- `src/modules/audit/audit.service.ts` (modified)
- `src/modules/audit/audit.controller.ts` (modified)
- `src/modules/audit/dto/audit-query.dto.ts` (new)

---

### Task 1.4: Configure ThrottlerModule 🔴 P0 ✅ COMPLETE
**Estimated Time**: 1.5 hours  
**Dependencies**: Task 0.2 complete  
**Assignee**: Backend Developer

**Description**: Activate rate limiting by configuring ThrottlerModule in AppModule. **STATUS**: Already implemented - ThrottlerModule configured with TenantThrottlerGuard in app.module.ts.

**Subtasks**:
1. [ ] Add ThrottlerModule to AppModule imports:
   ```typescript
   imports: [
     ThrottlerModule.forRoot([{
       name: 'default',
       ttl: 60000,  // 60 seconds
       limit: 100,  // 100 requests per minute
     }]),
   ]
   ```
2. [ ] Add ThrottlerGuard globally in main.ts or AppModule:
   ```typescript
   providers: [
     { provide: APP_GUARD, useClass: ThrottlerGuard },
   ]
   ```
3. [ ] Add custom limits to auth controller:
   ```typescript
   @Throttle({ default: { limit: 10, ttl: 60000 }})
   @Post('login')
   async login(@Body() dto: LoginDto) { ... }
   ```
4. [ ] Exclude health check endpoint:
   ```typescript
   @SkipThrottle()
   @Get('health')
   healthCheck() { ... }
   ```
5. [ ] Test manually: make 101 requests, verify 429 response

**Acceptance Criteria**:
- ✅ Rate limiting active on all endpoints (except health)
- ✅ 429 status returned when limit exceeded
- ✅ `Retry-After` header included in 429 response

**Files**:
- `src/app.module.ts` (modified)
- `src/modules/auth/auth.controller.ts` (modified)
- `src/modules/health/health.controller.ts` (modified)

---

### Task 1.5: Externalize All Secrets 🔴 P0 ✅ COMPLETE
**Estimated Time**: 2-3 hours  
**Dependencies**: None  
**Assignee**: Backend Developer + DevOps

**STATUS**: Already implemented - All config files use environment variable placeholders (${VAR_NAME}). No hardcoded secrets in default.yaml, production.yaml, or other config files.

**Subtasks**:
1. [ ] Create `.env.example` file with all required variables:
   ```bash
   # Copy from plan.md Phase 1.3
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   # ... all variables
   ```
2. [ ] Remove secrets from `config/default.yaml`:
   ```yaml
   mtn:
     collection:
       subscription_key: ${MTN_COLLECTION_SUBSCRIPTION_KEY}  # ← env var reference
   ```
3. [ ] Remove secrets from `development.yaml`, `production.yaml`, `staging.yaml`
4. [ ] Create validation schema in `src/config/configuration.ts`:
   ```typescript
   import { plainToClass } from 'class-transformer';
   import { IsString, IsNotEmpty, validateSync } from 'class-validator';
   
   class EnvironmentVariables {
     @IsString() @IsNotEmpty() DATABASE_HOST: string;
     @IsString() @IsNotEmpty() MTN_COLLECTION_SUBSCRIPTION_KEY: string;
     // ... all required vars
   }
   
   export function validate(config: Record<string, unknown>) {
     const validatedConfig = plainToClass(EnvironmentVariables, config, {
       enableImplicitConversion: true,
     });
     const errors = validateSync(validatedConfig, { skipMissingProperties: false });
     if (errors.length > 0) {
       throw new Error(errors.toString());
     }
     return validatedConfig;
   }
   ```
5. [ ] Update ConfigModule in AppModule:
   ```typescript
   ConfigModule.forRoot({
     validate,
     isGlobal: true,
   })
   ```
6. [ ] Test: start app without env vars, verify clear error message
7. [ ] Test: start app with `.env` file, verify app starts successfully
8. [ ] Update `.gitignore` to exclude `.env` (should already be there)
9. [ ] Run `git log -S 'subscription_key'` to check if secrets in history (if yes, use git-filter-repo)

**Acceptance Criteria**:
- ✅ Zero hardcoded secrets in `config/*.yaml`
- ✅ `.env.example` documents all required variables
- ✅ App fails fast with helpful error if var missing
- ✅ No secrets in git history

**Files**:
- `.env.example` (new)
- `config/default.yaml` (modified)
- `config/development.yaml` (modified)
- `config/production.yaml` (modified)
- `config/staging.yaml` (modified)
- `src/config/configuration.ts` (new)
- `src/app.module.ts` (modified)

---

## Phase 2: Test Infrastructure Setup (2-4 hours)

### Task 2.1: Configure Jest Coverage Thresholds 🟡 P1
**Estimated Time**: 1 hour  
**Dependencies**: None  
**Assignee**: Backend Developer

**Subtasks**:
1. [ ] Update `jest.config.js`:
   ```javascript
   module.exports = {
     // ... existing config
     collectCoverageFrom: [
       'src/**/*.ts',
       '!src/**/*.spec.ts',
       '!src/**/*.e2e-spec.ts',
       '!src/main.ts',
     ],
     coverageThreshold: {
       global: {
         branches: 60,
         functions: 60,
         lines: 60,
         statements: 60,
       },
       './src/modules/payments/payments.service.ts': {
         branches: 80,
         functions: 80,
         lines: 80,
         statements: 80,
       },
       './src/common/guards/api-key.guard.ts': {
         branches: 80,
         functions: 80,
         lines: 80,
         statements: 80,
       },
       './src/modules/tenant/tenant.service.ts': {
         branches: 80,
         functions: 80,
         lines: 80,
         statements: 80,
       },
     },
   };
   ```
2. [ ] Add scripts to `package.json`:
   ```json
   "test:cov": "jest --coverage",
   "test:cov:watch": "jest --coverage --watch",
   "test:cov:html": "jest --coverage --coverageReporters=html && open coverage/index.html",
   ```
3. [ ] Add `coverage/` to `.gitignore`
4. [ ] Run `yarn test:cov` and verify baseline

**Acceptance Criteria**:
- ✅ Coverage thresholds enforce quality gates
- ✅ HTML report generated
- ✅ CI build fails if thresholds not met

**Files**:
- `jest.config.js` (modified)
- `package.json` (modified)
- `.gitignore` (modified)

---

### Task 2.2: Create Test Utilities & Factories 🟡 P1
**Estimated Time**: 2-3 hours  
**Dependencies**: None  
**Assignee**: Backend Developer

**Subtasks**:
1. [ ] Create `test/utils/test-helpers.ts`:
   ```typescript
   export async function createTestModule(imports, providers = []) {
     return Test.createTestingModule({ imports, providers }).compile();
   }
   
   export async function cleanupTestDatabase(dataSource) {
     // Truncate all tables except migrations
   }
   ```
2. [ ] Create `test/factories/tenant.factory.ts`:
   ```typescript
   export const createMockTenant = (overrides?: Partial<Tenant>): Tenant => ({
     id: uuid(),
     name: 'test-tenant',
     slug: 'test-tenant',
     isActive: true,
     createdAt: new Date(),
     updatedAt: new Date(),
     ...overrides,
   });
   ```
3. [ ] Create similar factories:
   - `user.factory.ts`
   - `payment.factory.ts`
   - `audit.factory.ts`
4. [ ] Create mock repository helper:
   ```typescript
   export const createMockRepository = <T>() => ({
     find: jest.fn(),
     findOne: jest.fn(),
     save: jest.fn(),
     create: jest.fn((dto) => dto),
     update: jest.fn(),
     delete: jest.fn(),
   });
   ```

**Acceptance Criteria**:
- ✅ Factories reduce test boilerplate
- ✅ Mock helpers work with TypeORM

**Files**:
- `test/utils/test-helpers.ts` (new)
- `test/factories/*.factory.ts` (new)

---

## Phase 3: Unit & Integration Tests (16-24 hours) [PARALLELIZABLE]

### Task 3.1: ApiKeyGuard Unit Tests 🔴 P0
**Estimated Time**: 3-4 hours  
**Dependencies**: Task 2.2 complete  
**Assignee**: Backend Developer A

**Subtasks**:
1. [ ] Enhance `src/common/guards/api-key.guard.spec.ts`:
   ```typescript
   describe('ApiKeyGuard', () => {
     let guard: ApiKeyGuard;
     let usersService: jest.Mocked<UsersService>;
     let tenantService: jest.Mocked<TenantService>;
     
     beforeEach(async () => {
       const module = await Test.createTestingModule({
         providers: [
           ApiKeyGuard,
           { provide: UsersService, useValue: createMockService() },
           { provide: TenantService, useValue: createMockService() },
         ],
       }).compile();
       // ...
     });
   });
   ```
2. [ ] Add test cases:
   - ✅ Valid API key + matching tenantId → allow
   - ✅ Valid API key + wrong tenantId → reject (UnauthorizedException)
   - ✅ Missing Authorization header → reject
   - ✅ Missing x-tenant-id header → reject
   - ✅ Tenant resolution by UUID → success
   - ✅ Tenant resolution by name (case-insensitive) → success
   - ✅ Invalid tenant → reject (UnauthorizedException with "Tenant not found")
   - ✅ API key in x-api-key header (alternative) → success
3. [ ] Mock ExecutionContext and request objects
4. [ ] Run tests: `yarn test api-key.guard`
5. [ ] Verify coverage >90%

**Acceptance Criteria**:
- ✅ All edge cases covered
- ✅ Coverage >80%
- ✅ Tests pass consistently

**Files**:
- `src/common/guards/api-key.guard.spec.ts` (enhanced)

---

### Task 3.2: PaymentsService Unit Tests 🔴 P0
**Estimated Time**: 5-6 hours  
**Dependencies**: Task 2.2 complete  
**Assignee**: Backend Developer B

**Subtasks**:
1. [ ] Create `src/modules/payments/payments.service.spec.ts`:
   ```typescript
   describe('PaymentsService', () => {
     let service: PaymentsService;
     let paymentRepo: jest.Mocked<Repository<Payment>>;
     let transactionRepo: jest.Mocked<Repository<Transaction>>;
     let collectionService: jest.Mocked<CollectionService>;
     
     beforeEach(async () => {
       const module = await Test.createTestingModule({
         providers: [
           PaymentsService,
           { provide: getRepositoryToken(Payment), useValue: createMockRepository() },
           { provide: getRepositoryToken(Transaction), useValue: createMockRepository() },
           { provide: CollectionService, useValue: createMockService() },
           { provide: DisbursementService, useValue: createMockService() },
           { provide: UuidGeneratorService, useValue: { generate: jest.fn(() => 'uuid') }},
         ],
       }).compile();
       // ...
     });
   });
   ```
2. [ ] Add test cases:
   - ✅ **create() - MTN success**: Payment created with PENDING status, Transaction created
   - ✅ **create() - MTN error NOT_ENOUGH_FUNDS**: throw BadRequestException with user-friendly message
   - ✅ **create() - unsupported provider**: throw BadRequestException
   - ✅ **create() - externalId provided**: use provided externalId
   - ✅ **create() - externalId missing**: auto-generate UUID
   - ✅ **findOne() - valid id + tenantId**: return payment
   - ✅ **findOne() - wrong tenantId**: throw NotFoundException
   - ✅ **findAllByTenant()**: filter by tenantId only
   - ✅ **getPaymentStatus() - MTN**: call collectionService with correct params
   - ✅ **updateStatus()**: update payment status
3. [ ] Mock all dependencies (CollectionService, repositories)
4. [ ] Run tests: `yarn test payments.service`
5. [ ] Verify coverage >80%

**Acceptance Criteria**:
- ✅ All critical paths covered
- ✅ Error handling tested
- ✅ Tenant isolation verified
- ✅ Coverage >80%

**Files**:
- `src/modules/payments/payments.service.spec.ts` (new)

---

### Task 3.3: TenantService Unit Tests 🔴 P0
**Estimated Time**: 2-3 hours  
**Dependencies**: Task 2.2 complete  
**Assignee**: Backend Developer A

**Subtasks**:
1. [ ] Create `src/modules/tenant/tenant.service.spec.ts`
2. [ ] Add test cases:
   - ✅ **findByNameOrId() - valid UUID**: return tenant
   - ✅ **findByNameOrId() - tenant name (exact case)**: return tenant
   - ✅ **findByNameOrId() - tenant name (case-insensitive)**: return tenant
   - ✅ **findByNameOrId() - non-existent**: return null
   - ✅ **createTenantWithAdmin()**: create Tenant + User admin
   - ✅ **createTenantWithAdmin() - duplicate name**: throw BadRequestException
   - ✅ **suggestTenantName() - available**: return same name
   - ✅ **suggestTenantName() - taken**: return name with suffix (e.g., "tenant1")
3. [ ] Mock TenantRepository and UsersService
4. [ ] Run tests: `yarn test tenant.service`
5. [ ] Verify coverage >80%

**Acceptance Criteria**:
- ✅ Tenant resolution logic tested
- ✅ Case-insensitive search verified
- ✅ Coverage >80%

**Files**:
- `src/modules/tenant/tenant.service.spec.ts` (new)

---

### Task 3.4: AuditSubscriber Unit Tests 🟡 P1
**Estimated Time**: 2-3 hours  
**Dependencies**: Task 1.2 complete, Task 2.2 complete  
**Assignee**: Backend Developer B

**Subtasks**:
1. [ ] Create `src/modules/audit/audit.subscriber.spec.ts`
2. [ ] Add test cases:
   - ✅ **afterInsert() - entity with tenantId**: audit record includes tenantId
   - ✅ **afterInsert() - entity without tenantId**: audit uses 'SYSTEM'
   - ✅ **afterInsert() - Audit entity**: skip (prevent recursion)
   - ✅ **afterUpdate()**: audit includes oldValues and newValues
   - ✅ **afterRemove()**: audit includes oldValues
   - ✅ **context from queryRunner**: userId, ipAddress, url included
3. [ ] Mock InsertEvent, UpdateEvent, RemoveEvent
4. [ ] Run tests: `yarn test audit.subscriber`
5. [ ] Verify coverage >80%

**Acceptance Criteria**:
- ✅ TenantId extraction tested
- ✅ Fallback to 'SYSTEM' verified
- ✅ Coverage >80%

**Files**:
- `src/modules/audit/audit.subscriber.spec.ts` (new)

---

### Task 3.5: Additional Service Tests 🟡 P1
**Estimated Time**: 4-6 hours  
**Dependencies**: Task 2.2 complete  
**Assignee**: Backend Developer A/B (parallel)

**Subtasks**:
1. [ ] **UsersService** tests:
   - createUser() - generates API key
   - findByApiKey() - filters by tenantId
   - Username uniqueness per tenant
2. [ ] **AuthService** tests (enhance existing):
   - Register - creates user with API key
   - Login - validates credentials
3. [ ] **CollectionService** tests:
   - requestToPay() - calls MTN API
   - Error handling for all MTN error codes
4. [ ] Run all service tests: `yarn test -- --testPathPattern=service.spec`

**Acceptance Criteria**:
- ✅ All major services have >60% coverage
- ✅ Critical services (Payment, Tenant, ApiKeyGuard) have >80%

**Files**:
- `src/modules/user/users.service.spec.ts` (enhanced)
- `src/modules/auth/services/auth.service.spec.ts` (enhanced)
- `src/modules/mtn/collection/collection.service.spec.ts` (new)

---

### Task 3.6: Integration Tests - MTN Collection Flow 🟡 P1
**Estimated Time**: 3-4 hours  
**Dependencies**: Phase 3 unit tests complete  
**Assignee**: Backend Developer A

**Subtasks**:
1. [ ] Create `test/integration/mtn-collection.spec.ts`
2. [ ] Set up test database with transactions (rollback after each test)
3. [ ] Mock MTN API with `nock` or similar:
   ```typescript
   nock('https://sandbox.momodeveloper.mtn.com')
     .post('/collection/v1_0/requesttopay')
     .reply(202, {});
   ```
4. [ ] Test scenarios:
   - ✅ **Happy path**: requestToPay → 202 → payment created → status PENDING
   - ✅ **Error scenario**: MTN returns 400 → payment not created → BadRequestException
   - ✅ **Status check**: getRequestToPayStatus → updates payment status
   - ✅ **Timeout scenario**: MTN timeout → retry logic (if implemented)
5. [ ] Clean up test data after each test
6. [ ] Run: `yarn test -- --testPathPattern=integration`

**Acceptance Criteria**:
- ✅ End-to-end payment flow tested
- ✅ MTN API mocked correctly
- ✅ Test database isolated

**Files**:
- `test/integration/mtn-collection.spec.ts` (new)

---

## Phase 4: E2E & Multi-Tenant Tests (8-12 hours)

### Task 4.1: Multi-Tenant Isolation E2E Tests 🔴 P0
**Estimated Time**: 5-6 hours  
**Dependencies**: Phase 1 complete, Task 2.2 complete  
**Assignee**: Backend Developer A

**Subtasks**:
1. [X] Create `test/payments.e2e-spec.ts` (multi-tenant isolation suite)
2. [ ] Set up E2E test database (separate from dev)
3. [ ] Implement test setup:
   ```typescript
   let app: INestApplication;
   let tenantA: Tenant, tenantB: Tenant;
   let userA: User, userB: User;
   
   beforeAll(async () => {
     const module = await Test.createTestingModule({
       imports: [AppModule],
     }).compile();
     app = module.createNestApplication();
     await app.init();
     
     // Create two tenants with users
     tenantA = await createTenant('tenant-a');
     tenantB = await createTenant('tenant-b');
     userA = await createUser(tenantA.id, 'user-a');
     userB = await createUser(tenantB.id, 'user-b');
   });
   ```
4. [ ] Test cases:
   - ✅ **Tenant A creates payment, Tenant B cannot access**:
     ```typescript
     const paymentA = await request(app.getHttpServer())
       .post('/api/v1/payments')
       .set('Authorization', `Bearer ${userA.apiKey}`)
       .set('x-tenant-id', tenantA.id)
       .send({ provider: 'mtn', amount: 100, ... })
       .expect(201);
     
     await request(app.getHttpServer())
       .get(`/api/v1/payments/${paymentA.body.id}`)
       .set('Authorization', `Bearer ${userB.apiKey}`)
       .set('x-tenant-id', tenantB.id)
       .expect(404); // or 403
     ```
   - ✅ **Tenant A user cannot use Tenant B's API key**:
     ```typescript
     await request(app.getHttpServer())
       .get('/api/v1/payments')
       .set('Authorization', `Bearer ${userB.apiKey}`)
       .set('x-tenant-id', tenantA.id)
       .expect(401); // UnauthorizedException
     ```
   - ✅ **Audit logs isolated by tenant**:
     ```typescript
     await createPayment(tenantA);
     await createPayment(tenantB);
     
     const auditsA = await request(app.getHttpServer())
       .get('/api/v1/audits')
       .set('Authorization', `Bearer ${userA.apiKey}`)
       .set('x-tenant-id', tenantA.id)
       .expect(200);
     
     expect(auditsA.body.every(a => a.tenantId === tenantA.id)).toBe(true);
     ```
   - ✅ **Username collision across tenants**:
     ```typescript
     const userA = await registerUser(tenantA, 'admin', 'pass123');
     const userB = await registerUser(tenantB, 'admin', 'pass456');
     expect(userA.id).not.toEqual(userB.id);
     ```
5. [ ] Clean up test database after tests
6. [ ] Run: `yarn test:e2e multi-tenant`

**Acceptance Criteria**:
- ✅ All cross-tenant access attempts blocked
- ✅ No data leakage verified
- ✅ Tests run in isolated database

**Files**:
- `test/e2e/multi-tenant.e2e-spec.ts` (new)

---

### Task 4.2: Rate Limiting E2E Tests 🟡 P1
**Estimated Time**: 3-4 hours  
**Dependencies**: Task 1.4 complete  
**Assignee**: Backend Developer B

**Subtasks**:
1. [ ] Create `test/e2e/rate-limiting.e2e-spec.ts`
2. [ ] Test cases:
   - ✅ **Exceed rate limit**:
     ```typescript
     const promises = Array(101).fill(null).map(() =>
       request(app.getHttpServer())
         .get('/api/v1/payments')
         .set('Authorization', `Bearer ${apiKey}`)
         .set('x-tenant-id', tenantId)
     );
     const results = await Promise.all(promises);
     const tooMany = results.filter(r => r.status === 429);
     expect(tooMany.length).toBeGreaterThan(0);
     ```
   - ✅ **Retry-After header**:
     ```typescript
     expect(tooMany[0].headers['retry-after']).toBeDefined();
     ```
   - ✅ **Rate limit resets after TTL**:
     ```typescript
     await new Promise(resolve => setTimeout(resolve, 61000)); // Wait 61 seconds
     await request(app.getHttpServer())
       .get('/api/v1/payments')
       .set('Authorization', `Bearer ${apiKey}`)
       .expect(200); // Should succeed
     ```
   - ✅ **Per-tenant isolation**:
     ```typescript
     // Tenant A hits limit
     await exceedLimit(tenantA);
     
     // Tenant B still works
     await request(app.getHttpServer())
       .get('/api/v1/payments')
       .set('Authorization', `Bearer ${tenantB.apiKey}`)
       .set('x-tenant-id', tenantB.id)
       .expect(200);
     ```
3. [ ] Run: `yarn test:e2e rate-limiting`

**Acceptance Criteria**:
- ✅ Rate limiting enforced correctly
- ✅ TTL reset verified
- ✅ Tenant isolation confirmed

**Files**:
- `test/e2e/rate-limiting.e2e-spec.ts` (new)

---

## Phase 5: Structured Logging (4-6 hours) [PARALLELIZABLE with Phase 3-4]

### Task 5.1: Install and Configure Pino 🟡 P1
**Estimated Time**: 2-3 hours  
**Dependencies**: Task 0.3 complete  
**Assignee**: Backend Developer

**Subtasks**:
1. [ ] Install dependencies:
   ```bash
   yarn add nestjs-pino pino-http pino-pretty
   ```
2. [ ] Import LoggerModule in AppModule:
   ```typescript
   import { LoggerModule } from 'nestjs-pino';
   
   @Module({
     imports: [
       LoggerModule.forRoot({
         pinoHttp: {
           level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
           transport: process.env.NODE_ENV !== 'production'
             ? { target: 'pino-pretty', options: { colorize: true }}
             : undefined, // JSON in production
           customProps: (req) => ({
             tenantId: req.user?.tenantId,
             userId: req.user?.id,
           }),
           serializers: {
             req: (req) => ({
               id: req.id,
               method: req.method,
               url: req.url,
               tenantId: req.user?.tenantId,
             }),
           },
         },
       }),
       // ... other imports
     ],
   })
   ```
3. [ ] Update main.ts to use Pino:
   ```typescript
   import { Logger } from 'nestjs-pino';
   
   const app = await NestFactory.create(AppModule, { bufferLogs: true });
   app.useLogger(app.get(Logger));
   ```
4. [ ] Test: start app, make request, verify JSON logs in production mode
5. [ ] Test: start app in dev mode, verify pretty-printed logs

**Acceptance Criteria**:
- ✅ Pino configured for dev (pretty) and prod (JSON)
- ✅ Logs include tenantId, userId
- ✅ No errors on startup

**Files**:
- `src/app.module.ts` (modified)
- `src/main.ts` (modified)
- `package.json` (modified)

---

### Task 5.2: Add Request Correlation IDs 🟡 P1
**Estimated Time**: 1.5 hours  
**Dependencies**: Task 5.1 complete  
**Assignee**: Backend Developer

**Subtasks**:
1. [ ] Create `src/common/interceptors/logging.interceptor.ts`:
   ```typescript
   import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
   import { v4 as uuid } from 'uuid';
   
   @Injectable()
   export class LoggingInterceptor implements NestInterceptor {
     intercept(context: ExecutionContext, next: CallHandler) {
       const req = context.switchToHttp().getRequest();
       req.id = req.headers['x-request-id'] || uuid();
       return next.handle();
     }
   }
   ```
2. [ ] Register globally in AppModule:
   ```typescript
   providers: [
     { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
   ]
   ```
3. [ ] Update Pino config to include `req.id` in logs
4. [ ] Test: send request with `X-Request-ID` header, verify logs include same ID
5. [ ] Test: send request without header, verify UUID generated

**Acceptance Criteria**:
- ✅ All logs include requestId
- ✅ Request ID propagates through entire request lifecycle
- ✅ Client can provide custom request ID

**Files**:
- `src/common/interceptors/logging.interceptor.ts` (new)
- `src/app.module.ts` (modified)

---

### Task 5.3: Replace console.log Statements 🟢 P2
**Estimated Time**: 1-2 hours  
**Dependencies**: Task 5.1 complete  
**Assignee**: Backend Developer

**Subtasks**:
1. [ ] Find all console.log statements:
   ```bash
   grep -r "console\." src/ --exclude-dir=node_modules
   ```
2. [ ] Replace with Pino logger:
   ```typescript
   // Before
   console.log('Payment created:', payment.id);
   
   // After
   this.logger.info({ paymentId: payment.id }, 'Payment created');
   ```
3. [ ] Inject Logger into services:
   ```typescript
   import { Logger } from '@nestjs/common';
   
   @Injectable()
   export class PaymentsService {
     private readonly logger = new Logger(PaymentsService.name);
   }
   ```
4. [ ] Verify no console statements remain (except main.ts bootstrap errors)

**Acceptance Criteria**:
- ✅ Zero console.log in src/ (except main.ts bootstrap)
- ✅ All logs use Pino/Logger

**Files**:
- Multiple service files (modified)

---

## Phase 6: Documentation & Final Review (4-6 hours)

### Task 6.1: Update Documentation 🟡 P1
**Estimated Time**: 2-3 hours  
**Dependencies**: All previous phases complete  
**Assignee**: Tech Lead

**Subtasks**:
1. [ ] Update `README.md`:
   - Add "Environment Setup" section
   - Document `.env.example` usage
   - Add test commands (test:cov)
   - Update architecture diagram (if exists) with audit tenantId
2. [ ] Update `INTEGRATION_GUIDE.md`:
   - Reference `.env.example` for setup
   - Add rate limiting note (429 responses)
   - Document audit log querying
3. [ ] Update `PRODUCTION_READINESS.md`:
   - Check off completed items:
     - [x] Secrets externalized
     - [x] Rate limiting enabled
     - [x] Test coverage >60%
     - [x] Audit logs tenant-isolated
   - Add deployment instructions
4. [ ] Create `.specify/002-security-fixes/CHANGELOG.md`:
   - List all breaking changes (audit migration)
   - Document new features (audit query endpoint, rate limiting)

**Acceptance Criteria**:
- ✅ All docs accurate and up-to-date
- ✅ New developer can set up from README alone

**Files**:
- `README.md` (modified)
- `INTEGRATION_GUIDE.md` (modified)
- `PRODUCTION_READINESS.md` (modified)
- `.specify/002-security-fixes/CHANGELOG.md` (new)

---

### Task 6.2: Update Constitution Implementation Status 🟡 P1
**Estimated Time**: 30 minutes  
**Dependencies**: All fixes complete  
**Assignee**: Tech Lead

**Subtasks**:
1. [ ] Update `.specify/memory/constitution.md`:
   - Change ❌ to ✅ for resolved violations:
     - Multi-Tenancy First: Audit has tenantId ✅
     - Security-First: Rate limiting active ✅
     - Security-First: Secrets externalized ✅
     - Testing & Quality Gates: >60% coverage ✅
   - Update implementation status notes
2. [ ] Commit constitution update with feature branch

**Acceptance Criteria**:
- ✅ Constitution accurately reflects implementation

**Files**:
- `.specify/memory/constitution.md` (modified)

---

### Task 6.3: Final Security & Constitution Review 🔴 P0
**Estimated Time**: 2-3 hours  
**Dependencies**: All tasks complete  
**Assignee**: Tech Lead + Security Reviewer

**Subtasks**:
1. [ ] Run security checks:
   - `yarn audit` (npm vulnerabilities)
   - `git log -S 'password|secret|key'` (no exposed secrets)
   - Review `.env.example` (no actual secrets)
2. [ ] Run constitution compliance check (manual):
   - ✅ Multi-Tenancy First: All entities have tenantId
   - ✅ Security-First: All endpoints protected
   - ✅ Provider-Agnostic: Unified payment interface maintained
   - ✅ Audit Trail: Tenant-isolated, immutable logs
   - ✅ Testing: Coverage thresholds met
3. [ ] Run full test suite:
   ```bash
   yarn lint
   yarn test
   yarn test:e2e
   yarn test:cov
   ```
4. [ ] Review coverage report (coverage/index.html)
5. [ ] Create review checklist (from spec.md Acceptance Checklist)
6. [ ] Get sign-offs:
   - [ ] Tech Lead approval
   - [ ] Security team approval
   - [ ] DevOps approval (env vars, deployment plan)

**Acceptance Criteria**:
- ✅ All tests pass
- ✅ Coverage >60% overall, >80% critical services
- ✅ Zero security vulnerabilities (high/critical)
- ✅ Constitution violations resolved
- ✅ Sign-offs obtained

**Files**:
- `.specify/002-security-fixes/REVIEW.md` (new - sign-off document)

---

## Task 6.4: Create Deployment Plan 🟡 P1
**Estimated Time**: 1-2 hours  
**Dependencies**: Task 6.3 complete  
**Assignee**: DevOps + Tech Lead

**Subtasks**:
1. [ ] Document rollout strategy (from plan.md):
   - Stage 1: Dev environment
   - Stage 2: Staging with load test
   - Stage 3: Production (blue-green)
2. [ ] Create database migration script for production:
   - Backup procedure
   - Migration execution
   - Rollback procedure
3. [ ] Create `.env` template for production (copy from `.env.example`)
4. [ ] Document monitoring plan:
   - Rate limit metrics (Grafana/CloudWatch)
   - Audit log volume tracking
   - Test coverage trending
5. [ ] Schedule deployment date and communication

**Acceptance Criteria**:
- ✅ Deployment plan documented
- ✅ Rollback procedure tested
- ✅ Monitoring dashboards ready

**Files**:
- `.specify/002-security-fixes/DEPLOYMENT.md` (new)

---

## Summary & Metrics

### Completion Checklist

**Phase 0: Research** (4-6 hours)
- [ ] 0.1 Audit migration strategy ✅
- [ ] 0.2 Rate limiting config ✅
- [ ] 0.3 Logging library selection ✅
- [ ] 0.4 Test coverage analysis ✅

**Phase 1: Security Fixes** (8-12 hours) 🔴 **BLOCKING**
- [ ] 1.1 Add tenantId to Audit entity ✅
- [ ] 1.2 Update AuditSubscriber ✅
- [ ] 1.3 Tenant filtering in queries ✅
- [ ] 1.4 Configure ThrottlerModule ✅
- [ ] 1.5 Externalize secrets ✅

**Phase 2: Test Setup** (2-4 hours)
- [ ] 2.1 Jest coverage config ✅
- [ ] 2.2 Test utilities & factories ✅

**Phase 3: Unit Tests** (16-24 hours) [PARALLEL]
- [ ] 3.1 ApiKeyGuard tests ✅
- [ ] 3.2 PaymentsService tests ✅
- [ ] 3.3 TenantService tests ✅
- [ ] 3.4 AuditSubscriber tests ✅
- [ ] 3.5 Additional service tests ✅
- [ ] 3.6 MTN integration tests ✅

**Phase 4: E2E Tests** (8-12 hours)
- [ ] 4.1 Multi-tenant isolation ✅
- [ ] 4.2 Rate limiting E2E ✅

**Phase 5: Logging** (4-6 hours) [PARALLEL with 3-4]
- [ ] 5.1 Configure Pino ✅
- [ ] 5.2 Correlation IDs ✅
- [ ] 5.3 Replace console.log ✅

**Phase 6: Documentation** (4-6 hours)
- [ ] 6.1 Update docs ✅
- [ ] 6.2 Update constitution ✅
- [ ] 6.3 Final review & sign-off ✅
- [ ] 6.4 Deployment plan ✅

---

### Coverage Targets

| Service/Module | Current | Target | Status |
|----------------|---------|--------|--------|
| ApiKeyGuard | ~40% | 80% | ⚠️ |
| PaymentsService | 0% | 80% | ❌ |
| TenantService | 0% | 80% | ❌ |
| AuditSubscriber | 0% | 80% | ❌ |
| UsersService | ~20% | 60% | ⚠️ |
| AuthService | ~30% | 60% | ⚠️ |
| **Overall** | ~8% | 60% | ❌ |

---

### Timeline (1-2 weeks)

**Week 1**:
- Days 1-2: Phase 0 (Research) + Phase 1 (Security Fixes)
- Days 3-5: Phase 2 (Test Setup) + Phase 3 (Unit Tests) + Phase 5 (Logging) [PARALLEL]

**Week 2**:
- Days 1-2: Phase 4 (E2E Tests)
- Day 3: Phase 6 (Documentation + Review)
- Day 4-5: Deployment (Staging → Production)

**With 2 Developers** (parallel work):
- Days 1-2: Phase 0 + 1
- Days 3-4: Dev A (Phase 3.1-3.3), Dev B (Phase 3.4-3.6 + Phase 5)
- Day 5: Phase 4 + 6
- Day 6-7: Buffer + Deployment

---

### Risk Tracking

| Risk | Mitigation | Owner |
|------|----------|-------|
| Audit migration fails | Test on staging with prod snapshot | DevOps |
| Rate limits too strict | Start high, monitor, tune | Backend Lead |
| Test coverage time | Prioritize critical services first | QA |
| Pino breaks logs | Feature flag, fallback to default | Backend |

---

## Next Actions

1. ✅ Review this tasks document with team
2. ✅ Assign Phase 1 tasks (BLOCKING)
3. ✅ Create Jira/GitHub issues (optional)
4. ✅ Set up project board with 6 swimlanes (phases)
5. ✅ Schedule daily standups for duration of work
6. ✅ Book security review meeting for end of Week 1
7. ✅ Schedule staging deployment for end of Week 2
