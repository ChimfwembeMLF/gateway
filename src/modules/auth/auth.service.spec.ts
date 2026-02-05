import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './services/auth.service';
import { UsersService } from '../user/users.service';
import { TenantService } from '../tenant/tenant.service';
import { RoleType } from 'src/common/enums/role-type.enum';
import { generateTestId, suppressConsole } from 'test/unit/test.utils';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let mockJwtService: jest.Mocked<JwtService>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockTenantService: jest.Mocked<TenantService>;

  suppressConsole();

  beforeEach(async () => {
    jest.clearAllMocks();

    mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as any;

    mockUsersService = {
      findByEmail: jest.fn(),
      findByUsernameOrEmail: jest.fn(),
      findById: jest.fn(),
    } as any;

    mockTenantService = {
      createTenantWithAdmin: jest.fn(),
    } as any;

    // Mock bcrypt.compare to return true by default
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: TenantService,
          useValue: mockTenantService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUserByEmail', () => {
    it('should return user data for valid credentials', async () => {
      // ARRANGE
      const email = `user-${generateTestId()}@example.com`;
      const password = 'SecurePassword123!';
      const mockUser = {
        id: generateTestId(),
        email,
        password: 'hashedPassword',
        username: 'testuser',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser as any);

      // ACT
      const result = await service.validateUserByEmail(email, password);

      // ASSERT
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(email);
    });

    it('should return null for non-existent user', async () => {
      // ARRANGE
      const email = `nonexistent-${generateTestId()}@example.com`;
      const password = 'SomePassword123!';

      mockUsersService.findByEmail.mockResolvedValue(null);

      // ACT
      const result = await service.validateUserByEmail(email, password);

      // ASSERT
      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      // ARRANGE
      const email = `user-${generateTestId()}@example.com`;
      const password = 'WrongPassword!';
      const mockUser = {
        id: generateTestId(),
        email,
        password: 'hashedPassword',
        username: 'testuser',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // ACT
      const result = await service.validateUserByEmail(email, password);

      // ASSERT
      expect(result).toBeNull();
    });

    it('should not return password in result', async () => {
      // ARRANGE
      const email = `user-${generateTestId()}@example.com`;
      const password = 'SecurePassword123!';
      const mockUser = {
        id: generateTestId(),
        email,
        password: 'hashedPassword',
        username: 'testuser',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser as any);

      // ACT
      const result = await service.validateUserByEmail(email, password);

      // ASSERT
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    it('should return user and token for valid user', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const userId = generateTestId();
      const token = 'jwt.token.here';
      const mockUser = {
        id: userId,
        tenantId,
        username: 'testuser',
        email: `user-${generateTestId()}@example.com`,
        password: 'hashedPassword',
        role: RoleType.USER,
      };

      mockJwtService.sign.mockReturnValue(token);

      // ACT
      const result = await service.login(mockUser);

      // ASSERT
      expect(result).toHaveProperty('token', token);
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: userId,
          tenantId,
          role: RoleType.USER,
        }),
      );
    });

    it('should include tenantId in JWT payload', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const userId = generateTestId();
      const token = 'jwt.token.here';
      const mockUser = {
        id: userId,
        tenantId,
        username: 'testuser',
        role: RoleType.ADMIN,
      };

      mockJwtService.sign.mockReturnValue(token);

      // ACT
      await service.login(mockUser);

      // ASSERT
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId }),
      );
    });

    it('should use default USER role if not provided', async () => {
      // ARRANGE
      const userId = generateTestId();
      const token = 'jwt.token.here';
      const mockUser = {
        id: userId,
        tenantId: generateTestId(),
        username: 'testuser',
        // no role provided
      };

      mockJwtService.sign.mockReturnValue(token);

      // ACT
      await service.login(mockUser);

      // ASSERT
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ role: RoleType.USER }),
      );
    });

    it('should remove password from returned user', async () => {
      // ARRANGE
      const mockUser = {
        id: generateTestId(),
        tenantId: generateTestId(),
        username: 'testuser',
        password: 'hashedPassword',
      };

      mockJwtService.sign.mockReturnValue('token');

      // ACT
      const result = await service.login(mockUser);

      // ASSERT
      expect(result.user).not.toHaveProperty('password');
    });
  });

  describe('register', () => {
    it('should successfully register new tenant and admin', async () => {
      // ARRANGE
      const tenantId = generateTestId();
      const adminId = generateTestId();
      const registerDto = {
        tenantName: `Tenant-${generateTestId()}`,
        description: 'Test tenant',
        username: `admin-${generateTestId()}`,
        email: `admin-${generateTestId()}@example.com`,
        password: 'SecurePassword123!',
      };

      const mockTenant = {
        id: tenantId,
        name: registerDto.tenantName,
        isActive: true,
      };

      const mockAdmin = {
        id: adminId,
        email: registerDto.email,
        role: RoleType.ADMIN,
        tenantId,
      };

      mockUsersService.findByUsernameOrEmail.mockResolvedValue(null);
      mockTenantService.createTenantWithAdmin.mockResolvedValue({
        tenant: mockTenant,
        admin: mockAdmin,
      } as any);

      // ACT
      const result = await service.register(registerDto);

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('tenant');
      expect(result.data).toHaveProperty('admin');
      expect(mockTenantService.createTenantWithAdmin).toHaveBeenCalled();
    });

    it('should check for duplicate username or email', async () => {
      // ARRANGE
      const registerDto = {
        tenantName: `Tenant-${generateTestId()}`,
        username: 'existinguser',
        email: `existing@example.com`,
        password: 'SecurePassword123!',
      };

      mockUsersService.findByUsernameOrEmail.mockResolvedValue({
        id: generateTestId(),
        username: registerDto.username,
      } as any);

      // ACT
      const result = await service.register(registerDto);

      // ASSERT
      expect(result.success).toBe(false);
      expect(mockTenantService.createTenantWithAdmin).not.toHaveBeenCalled();
    });

    it('should pass correct parameters to createTenantWithAdmin', async () => {
      // ARRANGE
      const registerDto = {
        tenantName: `Tenant-${generateTestId()}`,
        description: 'Test description',
        username: `admin-${generateTestId()}`,
        email: `admin-${generateTestId()}@example.com`,
        password: 'SecurePassword123!',
      };

      mockUsersService.findByUsernameOrEmail.mockResolvedValue(null);
      mockTenantService.createTenantWithAdmin.mockResolvedValue({
        tenant: { id: generateTestId() },
        admin: { id: generateTestId() },
      } as any);

      // ACT
      await service.register(registerDto);

      // ASSERT
      expect(mockTenantService.createTenantWithAdmin).toHaveBeenCalledWith(
        expect.objectContaining({
          name: registerDto.tenantName,
          description: registerDto.description,
          adminUsername: registerDto.username,
          adminEmail: registerDto.email,
          adminPassword: registerDto.password,
        }),
      );
    });

    it('should return success message on registration', async () => {
      // ARRANGE
      const registerDto = {
        tenantName: `Tenant-${generateTestId()}`,
        username: `admin-${generateTestId()}`,
        email: `admin-${generateTestId()}@example.com`,
        password: 'SecurePassword123!',
      };

      mockUsersService.findByUsernameOrEmail.mockResolvedValue(null);
      mockTenantService.createTenantWithAdmin.mockResolvedValue({
        tenant: { id: generateTestId() },
        admin: { id: generateTestId() },
      } as any);

      // ACT
      const result = await service.register(registerDto);

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.message).toContain('created successfully');
    });
  });

  describe('getUserByToken', () => {
    it('should return user for valid token', async () => {
      // ARRANGE
      const userId = generateTestId();
      const tenantId = generateTestId();
      const token = 'valid.jwt.token';
      const payload = { sub: userId, tenantId };
      const mockUser = {
        id: userId,
        tenantId,
        email: `user-${generateTestId()}@example.com`,
        username: 'testuser',
        password: 'hashedPassword',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue(mockUser as any);

      // ACT
      const result = await service.getUserByToken(token);

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user).not.toHaveProperty('password');
      expect(mockJwtService.verify).toHaveBeenCalledWith(token);
      expect(mockUsersService.findById).toHaveBeenCalledWith(userId, tenantId);
    });

    it('should return error for invalid token', async () => {
      // ARRANGE
      const token = 'invalid.jwt.token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // ACT
      const result = await service.getUserByToken(token);

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid or expired token');
    });

    it('should return error if user not found', async () => {
      // ARRANGE
      const userId = generateTestId();
      const tenantId = generateTestId();
      const token = 'valid.jwt.token';
      const payload = { sub: userId, tenantId };

      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue(null);

      // ACT
      const result = await service.getUserByToken(token);

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.message).toContain('User not found');
    });

    it('should pass tenantId from token to findById', async () => {
      // ARRANGE
      const userId = generateTestId();
      const tenantId = generateTestId();
      const token = 'valid.jwt.token';
      const payload = { sub: userId, tenantId };

      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue({
        id: userId,
        tenantId,
      } as any);

      // ACT
      await service.getUserByToken(token);

      // ASSERT
      expect(mockUsersService.findById).toHaveBeenCalledWith(userId, tenantId);
    });

    it('should return error for expired token', async () => {
      // ARRANGE
      const token = 'expired.jwt.token';
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      // ACT
      const result = await service.getUserByToken(token);

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid or expired token');
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should include tenantId in login JWT payload', async () => {
      // ARRANGE
      const tenantA = generateTestId();
      const tenantB = generateTestId();
      const userId = generateTestId();
      const token = 'jwt.token.here';

      const userInTenantA = {
        id: userId,
        tenantId: tenantA,
        username: 'testuser',
      };

      mockJwtService.sign.mockReturnValue(token);

      // ACT
      await service.login(userInTenantA);

      // ASSERT
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: tenantA }),
      );
      expect(mockJwtService.sign).not.toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: tenantB }),
      );
    });

    it('should validate tenantId when getting user by token', async () => {
      // ARRANGE
      const userId = generateTestId();
      const tenantId = generateTestId();
      const token = 'valid.jwt.token';
      const payload = { sub: userId, tenantId };

      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue({
        id: userId,
        tenantId,
      } as any);

      // ACT
      await service.getUserByToken(token);

      // ASSERT
      expect(mockUsersService.findById).toHaveBeenCalledWith(userId, tenantId);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors during email validation', async () => {
      // ARRANGE
      const email = `user-${generateTestId()}@example.com`;
      const password = 'SomePassword123!';

      mockUsersService.findByEmail.mockRejectedValue(new Error('DB Error'));

      // ACT & ASSERT
      await expect(
        service.validateUserByEmail(email, password),
      ).rejects.toThrow();
    });

    it('should handle database errors during registration', async () => {
      // ARRANGE
      const registerDto = {
        tenantName: `Tenant-${generateTestId()}`,
        username: `admin-${generateTestId()}`,
        email: `admin-${generateTestId()}@example.com`,
        password: 'SecurePassword123!',
      };

      mockUsersService.findByUsernameOrEmail.mockRejectedValue(
        new Error('DB Error'),
      );

      // ACT & ASSERT
      await expect(service.register(registerDto)).rejects.toThrow();
    });

    it('should handle JWT errors during login', async () => {
      // ARRANGE
      const mockUser = {
        id: generateTestId(),
        tenantId: generateTestId(),
        username: 'testuser',
      };

      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT Error');
      });

      // ACT & ASSERT
      await expect(service.login(mockUser)).rejects.toThrow();
    });
  });

  describe('Password Handling', () => {
    it('should not expose password in login response', async () => {
      // ARRANGE
      const mockUser = {
        id: generateTestId(),
        tenantId: generateTestId(),
        username: 'testuser',
        password: 'secretpassword',
      };

      mockJwtService.sign.mockReturnValue('token');

      // ACT
      const result = await service.login(mockUser);

      // ASSERT
      expect(result.user).not.toHaveProperty('password');
    });

    it('should not expose password in getUserByToken response', async () => {
      // ARRANGE
      const userId = generateTestId();
      const tenantId = generateTestId();
      const token = 'valid.jwt.token';
      const payload = { sub: userId, tenantId };
      const mockUser = {
        id: userId,
        tenantId,
        password: 'hashedPassword',
      };

      mockJwtService.verify.mockReturnValue(payload);
      mockUsersService.findById.mockResolvedValue(mockUser as any);

      // ACT
      const result = await service.getUserByToken(token);

      // ASSERT
      expect(result.user).not.toHaveProperty('password');
    });
  });
});
