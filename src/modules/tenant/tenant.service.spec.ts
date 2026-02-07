import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { TenantService } from './tenant.service';
import { Tenant } from './entities/tenant.entity';
import { CreateTenantWithAdminDto } from './dto/create-tenant-with-admin.dto';
import { UsersService } from '../user/users.service';
import { RoleType } from 'src/common/enums/role-type.enum';
import { generateTestId, suppressConsole } from 'test/unit/test.utils';

describe('TenantService', () => {
  let service: TenantService;
  let mockTenantRepository: jest.Mocked<Repository<Tenant>>;
  let mockUsersService: jest.Mocked<UsersService>;

  suppressConsole();

  beforeEach(async () => {
    mockTenantRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockUsersService = {
      createUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        {
          provide: getRepositoryToken(Tenant),
          useValue: mockTenantRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });


  describe('createTenantWithAdmin', () => {
    it('should successfully create a new tenant with admin', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const adminId = generateTestId();
      const dto: CreateTenantWithAdminDto = {
        name: `Tenant-${generateTestId()}`,
        adminEmail: `admin-${generateTestId()}@example.com`,
        adminUsername: `admin-${generateTestId()}`,
        adminPassword: 'SecurePassword123!',
        description: 'Test tenant',
        webhookUrl: 'https://example.com/webhook',
        webhookKey: 'webhook-key',
      };

      const mockTenant = {
        id: tenantId,
        name: dto.name,
        description: dto.description,
        webhookUrl: dto.webhookUrl,
        webhookKey: dto.webhookKey,
        isActive: true,
        apiKey: `tenant_${generateTestId()}`,
      };

      const mockAdmin = {
        id: adminId,
        email: dto.adminEmail,
        username: dto.adminUsername,
        role: RoleType.ADMIN,
        tenantId,
      };

      mockTenantRepository.findOne.mockResolvedValue(null);
      mockTenantRepository.create.mockReturnValue(mockTenant as any);
      mockTenantRepository.save.mockResolvedValue(mockTenant as any);
      mockUsersService.createUser.mockResolvedValue(mockAdmin as any);

      // ACT
      const result = await service.createTenantWithAdmin(dto);

      // ASSERT
      expect(result.tenant).toBeDefined();
      expect(result.tenant.name).toBe(dto.name);
      expect(result.admin).toBeDefined();
      expect(result.admin.role).toBe(RoleType.ADMIN);
      expect(mockTenantRepository.save).toHaveBeenCalled();
      expect(mockUsersService.createUser).toHaveBeenCalled();
    });

    it('should throw BadRequestException for duplicate tenant name', async () => {
      // ARRANGE
      const tenantName = `Tenant-${generateTestId()}`;
      const dto: CreateTenantWithAdminDto = {
        name: tenantName,
        adminEmail: `admin-${generateTestId()}@example.com`,
        adminUsername: `admin-${generateTestId()}`,
        adminPassword: 'SecurePassword123!',
        description: 'Test tenant',
      };

      mockTenantRepository.findOne.mockResolvedValue({
        id: generateTestId(),
        name: tenantName,
      } as any);

      // ACT & ASSERT
      await expect(service.createTenantWithAdmin(dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTenantRepository.save).not.toHaveBeenCalled();
    });

    it('should link admin user to tenant by tenantId', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const adminId = generateTestId();
      const dto: CreateTenantWithAdminDto = {
        name: `Tenant-${generateTestId()}`,
        adminEmail: `admin-${generateTestId()}@example.com`,
        adminUsername: `admin-${generateTestId()}`,
        adminPassword: 'SecurePassword123!',
      };

      const mockTenant = {
        id: tenantId,
        name: dto.name,
        isActive: true,
      };

      const mockAdmin = {
        id: adminId,
        tenantId,
        role: RoleType.ADMIN,
      };

      mockTenantRepository.findOne.mockResolvedValue(null);
      mockTenantRepository.create.mockReturnValue(mockTenant as any);
      mockTenantRepository.save.mockResolvedValue(mockTenant as any);
      mockUsersService.createUser.mockResolvedValue(mockAdmin as any);

      // ACT
      const result = await service.createTenantWithAdmin(dto);

      // ASSERT
      expect(mockUsersService.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          role: RoleType.ADMIN,
        }),
      );
    });

    it('should set isActive to true on creation', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const dto: CreateTenantWithAdminDto = {
        name: `Tenant-${generateTestId()}`,
        adminEmail: `admin-${generateTestId()}@example.com`,
        adminUsername: `admin-${generateTestId()}`,
        adminPassword: 'SecurePassword123!',
      };

      const mockTenant = {
        id: tenantId,
        name: dto.name,
        isActive: true,
      };

      mockTenantRepository.findOne.mockResolvedValue(null);
      mockTenantRepository.create.mockReturnValue(mockTenant as any);
      mockTenantRepository.save.mockResolvedValue(mockTenant as any);
      mockUsersService.createUser.mockResolvedValue({} as any);

      // ACT
      const result = await service.createTenantWithAdmin(dto);

      // ASSERT
      expect(result.tenant.isActive).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return tenant by ID', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const mockTenant = {
        id: tenantId,
        name: 'Test Tenant',
        isActive: true,
      };

      mockTenantRepository.findOne.mockResolvedValue(mockTenant as any);

      // ACT
      const result = await service.findOne(tenantId);

      // ASSERT
      expect(result).toEqual(mockTenant);
      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({
        where: { id: tenantId },
      });
    });

    it('should return null if tenant not found', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      mockTenantRepository.findOne.mockResolvedValue(null);

      // ACT
      const result = await service.findOne(tenantId);

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all tenants', async () => {
      // ARRANGE
      const mockTenants = [
        { id: generateTestId(), name: 'Tenant1', isActive: true },
        { id: generateTestId(), name: 'Tenant2', isActive: true },
      ];

      mockTenantRepository.find.mockResolvedValue(mockTenants as any);

      // ACT
      const result = await service.findAll();

      // ASSERT
      expect(result).toEqual(mockTenants);
    });

    it('should return empty array if no tenants', async () => {
      // ARRANGE
      mockTenantRepository.find.mockResolvedValue([]);

      // ACT
      const result = await service.findAll();

      // ASSERT
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should successfully update tenant', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const updateData = {
        name: 'Updated Name',
      };

      mockTenantRepository.update.mockResolvedValue({} as any);
      mockTenantRepository.findOne.mockResolvedValue({
        id: tenantId,
        name: 'Updated Name',
        isActive: true,
      } as any);

      // ACT
      const result = await service.update(tenantId, updateData);

      // ASSERT
      expect(result?.name).toBe('Updated Name');
      expect(mockTenantRepository.update).toHaveBeenCalled();
    });

    it('should return null if tenant not found', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      mockTenantRepository.update.mockResolvedValue({} as any);
      mockTenantRepository.findOne.mockResolvedValue(null);

      // ACT
      const result = await service.update(tenantId, { name: 'New Name' });

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe('deactivate', () => {
    it('should deactivate a tenant', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      mockTenantRepository.update.mockResolvedValue({} as any);
      mockTenantRepository.findOne.mockResolvedValue({
        id: tenantId,
        isActive: false,
      } as any);

      // ACT
      const result = await service.deactivate(tenantId);

      // ASSERT
      expect(result?.isActive).toBe(false);
      expect(mockTenantRepository.update).toHaveBeenCalledWith(
        tenantId,
        { isActive: false },
      );
    });

    it('should return null if tenant not found', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      mockTenantRepository.update.mockResolvedValue({} as any);
      mockTenantRepository.findOne.mockResolvedValue(null);

      // ACT
      const result = await service.deactivate(tenantId);

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should remove a tenant', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      mockTenantRepository.delete.mockResolvedValue({ affected: 1 } as any);

      // ACT
      await service.remove(tenantId);

      // ASSERT
      expect(mockTenantRepository.delete).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('generateApiKey', () => {
    it('should generate and return a unique API key', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const apiKey = `tenant_${generateTestId()}`;

      mockTenantRepository.update.mockResolvedValue({} as any);

      // ACT
      const result = await service.generateApiKey(tenantId);

      // ASSERT
      expect(result).toMatch(/^tenant_[a-f0-9]{64}$/);
      expect(mockTenantRepository.update).toHaveBeenCalledWith(tenantId, {
        apiKey: expect.any(String),
      });
    });

    it('should update the tenant with new API key', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      mockTenantRepository.update.mockResolvedValue({} as any);

      // ACT
      await service.generateApiKey(tenantId);

      // ASSERT
      expect(mockTenantRepository.update).toHaveBeenCalledWith(
        tenantId,
        expect.objectContaining({
          apiKey: expect.any(String),
        }),
      );
    });
  });

  describe('suggestTenantName', () => {
    it('should return the name if not taken', async () => {
      // ARRANGE
      const name = 'my-tenant';
      mockTenantRepository.findOne.mockResolvedValue(null);

      // ACT
      const result = await service.suggestTenantName(name);

      // ASSERT
      expect(result).toBe(name);
    });

    it('should suggest alternative if name taken', async () => {
      // ARRANGE
      const name = 'my-tenant';
      mockTenantRepository.findOne.mockResolvedValueOnce({ id: '1' } as any);
      mockTenantRepository.findOne.mockResolvedValueOnce(null);

      // ACT
      const result = await service.suggestTenantName(name);

      // ASSERT
      expect(result).toBe('my-tenant1');
    });
  });

  describe('findByApiKey', () => {
    it('should return tenant by API key', async () => {
      // ARRANGE
      const apiKey = `tenant_${generateTestId()}`;
      const mockTenant = {
        id: generateTestId(),
        name: 'Test Tenant',
        apiKey,
      };

      mockTenantRepository.findOne.mockResolvedValue(mockTenant as any);

      // ACT
      const result = await service.findByApiKey(apiKey);

      // ASSERT
      expect(result).toEqual(mockTenant);
      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({
        where: { apiKey },
      });
    });

    it('should return null if API key not found', async () => {
      // ARRANGE
      const apiKey = `tenant_${generateTestId()}`;
      mockTenantRepository.findOne.mockResolvedValue(null);

      // ACT
      const result = await service.findByApiKey(apiKey);

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe('findByName', () => {
    it('should return tenant by name (case-insensitive)', async () => {
      // ARRANGE
      const name = 'Test Tenant';
      const mockTenant = {
        id: generateTestId(),
        name,
      };

      mockTenantRepository.find.mockResolvedValue([mockTenant] as any);

      // ACT
      const result = await service.findByName('test tenant');

      // ASSERT
      expect(result).toEqual(mockTenant);
    });

    it('should return null if name not found', async () => {
      // ARRANGE
      mockTenantRepository.find.mockResolvedValue([]);

      // ACT
      const result = await service.findByName('nonexistent');

      // ASSERT
      expect(result).toBeNull();
    });
  });

  describe('Tenant Isolation', () => {
    it('should query by tenantId only', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      mockTenantRepository.findOne.mockResolvedValue({
        id: tenantId,
      } as any);

      // ACT
      await service.findOne(tenantId);

      // ASSERT
      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({
        where: { id: tenantId },
      });
    });

    it('should not cross tenant boundaries', async () => {
      // ARRANGE
      const tenantA = generateTestId();
      mockTenantRepository.findOne.mockResolvedValue(null);

      // ACT
      const result = await service.findOne(tenantA);

      // ASSERT
      expect(result).toBeNull();
      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: tenantA }),
      });
    });
  });

  describe('API Key Management', () => {
    it('should generate unique API keys for different tenants', async () => {
      // ARRANGE
      const tenant1Id = generateTestId();
      const tenant2Id = generateTestId();

      mockTenantRepository.update.mockResolvedValue({} as any);

      // ACT
      const key1 = await service.generateApiKey(tenant1Id);
      const key2 = await service.generateApiKey(tenant2Id);

      // ASSERT
      expect(key1).not.toBe(key2);
    });
  });
});
