import { Repository, ObjectLiteral } from 'typeorm';

/**
 * Creates a mock TypeORM repository with common methods
 */
export function createMockRepository<T extends ObjectLiteral>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
      getManyAndCount: jest.fn(),
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    })),
  } as any;
}

/**
 * Creates a mock Express request with tenant context
 */
export function createMockRequest(overrides?: any) {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    tenant: { id: 'test-tenant-id', name: 'Test Tenant' },
    user: { id: 'test-user-id', tenantId: 'test-tenant-id' },
    ...overrides,
  };
}

/**
 * Creates a mock Express response
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
}

/**
 * Creates a mock ConfigService
 */
export function createMockConfigService(config: Record<string, any> = {}) {
  return {
    get: jest.fn((key: string) => config[key]),
    getOrThrow: jest.fn((key: string) => {
      if (!(key in config)) {
        throw new Error(`Config key ${key} not found`);
      }
      return config[key];
    }),
  };
}
