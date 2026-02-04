import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { TenantService } from '../../modules/tenant/tenant.service';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let tenantService: jest.Mocked<TenantService>;

  const mockTenant = {
    id: 'tenant-123',
    name: 'TestTenant',
    apiKey: 'test-api-key',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: TenantService,
          useValue: {
            findByApiKey: jest.fn(),
            findByName: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    tenantService = module.get(TenantService) as jest.Mocked<TenantService>;
  });

  describe('canActivate', () => {
    it('should allow request with valid API key and tenant ID', async () => {
      const mockRequest: any = {
        headers: {
          'x-api-key': 'test-api-key',
          'x-tenant-id': 'tenant-123',
        },
      };

      tenantService.findByApiKey.mockResolvedValue(mockTenant as any);

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.tenant).toEqual(mockTenant);
      expect(tenantService.findByApiKey).toHaveBeenCalledWith('test-api-key');
    });

    it('should allow request with tenant name (case-insensitive)', async () => {
      const mockRequest: any = {
        headers: {
          'x-api-key': 'test-api-key',
          'x-tenant-id': 'testtenant', // lowercase
        },
      };

      tenantService.findByApiKey.mockResolvedValue(mockTenant as any);
      tenantService.findByName.mockResolvedValue(mockTenant as any);

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockRequest.tenant).toEqual(mockTenant);
    });

    it('should throw UnauthorizedException when API key is missing', async () => {
      const mockRequest: any = {
        headers: { 'x-tenant-id': 'tenant-123' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when tenant ID is missing', async () => {
      const mockRequest: any = {
        headers: { 'x-api-key': 'test-api-key' },
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when API key is invalid', async () => {
      const mockRequest: any = {
        headers: {
          'x-api-key': 'invalid-key',
          'x-tenant-id': 'tenant-123',
        },
      };

      tenantService.findByApiKey.mockResolvedValue(null);

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when tenant is inactive', async () => {
      const inactiveTenant = { ...mockTenant, isActive: false };
      const mockRequest: any = {
        headers: {
          'x-api-key': 'test-api-key',
          'x-tenant-id': 'tenant-123',
        },
      };

      tenantService.findByApiKey.mockResolvedValue(inactiveTenant as any);

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should prevent cross-tenant access (API key mismatch)', async () => {
      const mockRequest: any = {
        headers: {
          'x-api-key': 'tenant-1-key',
          'x-tenant-id': 'tenant-2', // Different tenant
        },
      };

      const tenant1 = { ...mockTenant, id: 'tenant-1', apiKey: 'tenant-1-key' };
      const tenant2 = { ...mockTenant, id: 'tenant-2', apiKey: 'tenant-2-key' };

      tenantService.findByApiKey.mockResolvedValue(tenant1 as any);
      tenantService.findByName.mockResolvedValue(tenant2 as any);

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
