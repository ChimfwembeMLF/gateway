import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { TenantService } from '../../modules/tenant/tenant.service';
import { generateTestId, suppressConsole } from 'test/unit/test.utils';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let mockTenantService: jest.Mocked<TenantService>;

  suppressConsole();

  beforeEach(async () => {
    mockTenantService = {
      findByApiKey: jest.fn(),
      findByNameOrId: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
  });

  describe('canActivate', () => {
    it('should allow request with valid API key and tenant', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const apiKey = `tenant_${generateTestId()}`;
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-tenant-id': tenantId,
        },
        user: {},
        tenant: {} as any,
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      const mockTenant = {
        id: tenantId,
        name: 'test-tenant',
        apiKey,
        isActive: true,
      };

      mockTenantService.findByApiKey.mockResolvedValue(mockTenant as any);
      mockTenantService.findByNameOrId.mockResolvedValue(mockTenant as any);

      // ACT
      const result = await guard.canActivate(mockContext);

      // ASSERT
      expect(result).toBe(true);
      expect(mockTenantService.findByApiKey).toHaveBeenCalledWith(apiKey);
      expect(mockTenantService.findByNameOrId).toHaveBeenCalledWith(tenantId);
    });

    it('should reject request without API key header', async () => {
      // ARRANGE
      const request = {
        headers: {
          'x-tenant-id': generateTestId(),
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      // ACT & ASSERT
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockTenantService.findByApiKey).not.toHaveBeenCalled();
    });

    it('should reject request without tenant identifier header', async () => {
      // ARRANGE
      const request = {
        headers: {
          'x-api-key': `tenant_${generateTestId()}`,
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      // ACT & ASSERT
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject request with invalid API key', async () => {
      // ARRANGE
      const request = {
        headers: {
          'x-api-key': 'invalid-api-key',
          'x-tenant-id': generateTestId(),
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      mockTenantService.findByApiKey.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject request from inactive tenant', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const apiKey = `tenant_${generateTestId()}`;
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-tenant-id': tenantId,
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      mockTenantService.findByApiKey.mockResolvedValue({
        id: tenantId,
        apiKey,
        isActive: false, // Inactive tenant
      } as any);

      // ACT & ASSERT
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject if tenant identifier does not match API key tenant', async () => {
      // ARRANGE
      const tenantA = generateTestId();
      const tenantB = generateTestId();
      const apiKey = `tenant_${generateTestId()}`;
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-tenant-id': tenantB, // Different tenant
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      mockTenantService.findByApiKey.mockResolvedValue({
        id: tenantA, // API key belongs to TenantA
        apiKey,
        isActive: true,
      } as any);

      mockTenantService.findByNameOrId.mockResolvedValue({
        id: tenantB, // Request is for TenantB
        name: 'tenant-b',
      } as any);

      // ACT & ASSERT
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should attach tenant to request context', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const apiKey = `tenant_${generateTestId()}`;
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-tenant-id': tenantId,
        },
        user: {},
        tenant: {} as any,
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      const mockTenant = {
        id: tenantId,
        name: 'test-tenant',
        apiKey,
        isActive: true,
      };

      mockTenantService.findByApiKey.mockResolvedValue(mockTenant as any);
      mockTenantService.findByNameOrId.mockResolvedValue(mockTenant as any);

      // ACT
      await guard.canActivate(mockContext);

      // ASSERT
      expect(request.tenant).toBeDefined();
      expect(request.tenant.id).toBe(tenantId);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should prevent API key from TenantA accessing TenantB', async () => {
      // ARRANGE
      const tenantA = generateTestId();
      const tenantB = generateTestId();
      const apiKeyA = `tenant_${generateTestId()}`;
      const request = {
        headers: {
          'x-api-key': apiKeyA,
          'x-tenant-id': tenantB,
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      mockTenantService.findByApiKey.mockResolvedValue({
        id: tenantA,
        apiKey: apiKeyA,
        isActive: true,
      } as any);

      mockTenantService.findByNameOrId.mockResolvedValue({
        id: tenantB,
        name: 'tenant-b',
      } as any);

      // ACT & ASSERT
      await expect(guard.canActivate(mockContext)).rejects.toThrow();
    });

    it('should verify tenant IDs match exactly', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const apiKey = `tenant_${generateTestId()}`;
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-tenant-id': tenantId,
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      const mockTenant = {
        id: tenantId,
        apiKey,
        isActive: true,
      };

      mockTenantService.findByApiKey.mockResolvedValue(mockTenant as any);
      mockTenantService.findByNameOrId.mockResolvedValue(mockTenant as any);

      // ACT
      await guard.canActivate(mockContext);

      // ASSERT - Verify exact ID match
      expect(mockTenantService.findByApiKey).toHaveBeenCalledWith(apiKey);
      expect(mockTenantService.findByNameOrId).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors during API key validation', async () => {
      // ARRANGE
      const request = {
        headers: {
          'x-api-key': `tenant_${generateTestId()}`,
          'x-tenant-id': generateTestId(),
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      mockTenantService.findByApiKey.mockRejectedValue(new Error('DB Error'));

      // ACT & ASSERT
      await expect(guard.canActivate(mockContext)).rejects.toThrow();
    });

    it('should handle database errors during tenant lookup', async () => {
      // ARRANGE
      const apiKey = `tenant_${generateTestId()}`;
      const tenantId = generateTestId();
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-tenant-id': tenantId,
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      mockTenantService.findByApiKey.mockResolvedValue({
        id: tenantId,
        apiKey,
        isActive: true,
      } as any);

      mockTenantService.findByNameOrId.mockRejectedValue(new Error('DB Error'));

      // ACT & ASSERT
      await expect(guard.canActivate(mockContext)).rejects.toThrow();
    });
  });

  describe('API Key Validation', () => {
    it('should accept API key from environment as fallback', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const apiKey = `tenant_${generateTestId()}`;
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-tenant-id': tenantId,
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      mockTenantService.findByApiKey.mockResolvedValue({
        id: tenantId,
        apiKey,
        isActive: true,
      } as any);

      mockTenantService.findByNameOrId.mockResolvedValue({
        id: tenantId,
      } as any);

      // ACT
      const result = await guard.canActivate(mockContext);

      // ASSERT
      expect(result).toBe(true);
    });

    it('should validate API key format', async () => {
      // ARRANGE
      const request = {
        headers: {
          'x-api-key': '', // Empty API key
          'x-tenant-id': generateTestId(),
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      // ACT & ASSERT
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Tenant Identifier Resolution', () => {
    it('should resolve tenant by UUID', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const apiKey = `tenant_${generateTestId()}`;
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-tenant-id': tenantId,
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      const mockTenant = {
        id: tenantId,
        apiKey,
        isActive: true,
      };

      mockTenantService.findByApiKey.mockResolvedValue(mockTenant as any);
      mockTenantService.findByNameOrId.mockResolvedValue(mockTenant as any);

      // ACT
      await guard.canActivate(mockContext);

      // ASSERT
      expect(mockTenantService.findByNameOrId).toHaveBeenCalledWith(tenantId);
    });

    it('should resolve tenant by name', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const tenantName = 'my-tenant';
      const apiKey = `tenant_${generateTestId()}`;
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-tenant-id': tenantName,
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      const mockTenant = {
        id: tenantId,
        name: tenantName,
        apiKey,
        isActive: true,
      };

      mockTenantService.findByApiKey.mockResolvedValue(mockTenant as any);
      mockTenantService.findByNameOrId.mockResolvedValue(mockTenant as any);

      // ACT
      await guard.canActivate(mockContext);

      // ASSERT
      expect(mockTenantService.findByNameOrId).toHaveBeenCalledWith(
        tenantName,
      );
    });

    it('should reject if tenant identifier not found', async () => {
      // ARRANGE
      const apiKey = `tenant_${generateTestId()}`;
      const tenantId = generateTestId();
      const request = {
        headers: {
          'x-api-key': apiKey,
          'x-tenant-id': tenantId,
        },
        user: {},
      };

      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(request),
        }),
      } as any;

      mockTenantService.findByApiKey.mockResolvedValue({
        id: tenantId,
        apiKey,
        isActive: true,
      } as any);

      mockTenantService.findByNameOrId.mockResolvedValue(null);

      // ACT & ASSERT
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
