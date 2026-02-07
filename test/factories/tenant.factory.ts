import { Tenant } from 'src/modules/tenant/entities/tenant.entity';

export class TenantFactory {
  static create(overrides?: Partial<Tenant>): Tenant {
    const tenant = new Tenant();
    tenant.id = overrides?.id || 'test-tenant-id';
    tenant.name = overrides?.name || 'Test Tenant';
    tenant.apiKey = overrides?.apiKey || 'test-api-key';
    tenant.isActive = overrides?.isActive ?? true;
    tenant.createdAt = overrides?.createdAt || new Date();
    tenant.updatedAt = overrides?.updatedAt || new Date();
    return tenant;
  }

  static createMany(count: number, overrides?: Partial<Tenant>): Tenant[] {
    return Array.from({ length: count }, (_, i) => 
      TenantFactory.create({
        ...overrides,
        id: `test-tenant-${i}`,
        name: `Test Tenant ${i}`,
        apiKey: `test-api-key-${i}`,
      })
    );
  }
}
