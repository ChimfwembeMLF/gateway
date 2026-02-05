/**
 * Test Utilities & Helpers
 * Common functions for unit and E2E tests
 */

import { v4 as uuidv4 } from 'uuid';
import { CreatePaymentDto } from 'src/modules/payments/dto/create-payment.dto';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { PaymentProvider } from 'src/common/enums/provider.enum';
import { Payment, PaymentStatus } from 'src/modules/payments/entities/payment.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Tenant } from 'src/modules/tenant/entities/tenant.entity';

/**
 * Generate test IDs
 */
export const generateTestId = (): string => uuidv4();

/**
 * Generate Payment DTOs for testing
 */
export const generateTestPaymentDto = (overrides?: Partial<CreatePaymentDto>): CreatePaymentDto => ({
  provider: PaymentProvider.MTN,
  amount: 1000,
  currency: 'ZMW',
  externalId: `INV-${Date.now()}-${generateTestId().slice(0, 8)}`,
  payer: '260765725317',
  payerMessage: 'Test payment',
  payeeNote: 'Thank you for your payment',
  ...overrides,
});

/**
 * Generate User DTOs for testing
 */
export const generateTestUserDto = (overrides?: Partial<CreateUserDto>): CreateUserDto => {
  const base: CreateUserDto = {
    id: generateTestId(),
    username: `user-${generateTestId().slice(0, 8)}`,
    password: 'TestPassword123!@#',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (!overrides) return base;
  // Filter out undefined values from overrides to avoid type issues
  const filtered = Object.fromEntries(
    Object.entries(overrides).filter(([_, v]) => v !== undefined)
  );
  return { ...base, ...filtered } as CreateUserDto;
};

/**
 * Generate Tenant data for testing
 */
export const generateTestTenantData = (overrides?: Partial<any>) => ({
  name: `Test Tenant ${generateTestId().slice(0, 8)}`,
  country: 'ZM',
  currency: 'ZMW',
  ...overrides,
});

/**
 * Generate API Key for testing
 */
export const generateTestApiKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `key_test_${result}`;
};

/**
 * Create mock Payment entity
 */
export const createMockPayment = (overrides?: Partial<Payment>): Partial<Payment> => ({
  id: generateTestId(),
  tenantId: generateTestId(),
  amount: 1000,
  currency: 'ZMW',
  externalId: `INV-${Date.now()}`,
  payer: '260765725317',
  status: PaymentStatus.PENDING,
  momoTransactionId: generateTestId(),
  createdAt: new Date(),
  ...overrides,
});

/**
 * Create mock User entity
 */
export const createMockUser = (overrides?: Partial<User>): Partial<User> => ({
  id: generateTestId(),
  tenantId: generateTestId(),
  username: `user-${generateTestId().slice(0, 8)}`,
  email: `user-${generateTestId()}@example.com`,
  password: 'hashed_password',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create mock Tenant entity
 */
export const createMockTenant = (overrides?: Partial<Tenant>): Partial<Tenant> => ({
  id: generateTestId(),
  name: `Test Tenant ${generateTestId().slice(0, 8)}`,
  slug: `tenant-${generateTestId().slice(0, 8)}`,
  apiKey: `key_${generateTestId()}`,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Mock request object with tenant/user context
 */
export const createMockRequest = (overrides?: any) => ({
  id: generateTestId(),
  tenant: {
    id: generateTestId(),
    name: 'Test Tenant',
  },
  user: {
    id: generateTestId(),
    tenantId: 'test-tenant-id',
    email: 'test@example.com',
  },
  headers: {
    'x-api-key': generateTestApiKey(),
    'x-request-id': generateTestId(),
  },
  ...overrides,
});

/**
 * Wait for async operations
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Deep clone object for test isolation
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Assert tenant isolation
 */
export const assertTenantIsolation = (
  result: any,
  expectedTenantId: string,
  fieldName: string = 'tenantId',
) => {
  if (Array.isArray(result)) {
    expect(result.every(item => item[fieldName] === expectedTenantId)).toBe(true);
  } else {
    expect(result[fieldName]).toBe(expectedTenantId);
  }
};

/**
 * Mock MTN API responses
 */
export const MTN_MOCK_RESPONSES = {
  requestToPay: {
    success: {
      transactionId: () => generateTestId(),
      status: 'PENDING',
    },
    timeout: {
      code: 'TIMEOUT',
      message: 'Request timed out',
    },
    invalidPhone: {
      code: 'INVALID_PHONE',
      message: 'Invalid phone number',
    },
  },
  getStatus: {
    success: {
      status: 'SUCCESSFUL',
      amount: '1000',
      currency: 'ZMW',
    },
    pending: {
      status: 'PENDING',
    },
    failed: {
      status: 'FAILED',
      reason: 'Insufficient balance',
    },
  },
  transfer: {
    success: {
      transactionId: () => generateTestId(),
      status: 'SUCCESSFUL',
    },
    insufficientBalance: {
      code: 'INSUFFICIENT_BALANCE',
      message: 'Account balance insufficient',
    },
  },
};

/**
 * Suppress console during tests
 */
export const suppressConsole = () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });
};
