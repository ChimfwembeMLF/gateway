import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../../user/users.service';
import { TenantService } from '../../tenant/tenant.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let tenantService: TenantService;
  let jwtService: JwtService;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashed_password',
    role: 'USER',
    tenantId: 'tenant-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
          },
        },
        {
          provide: TenantService,
          useValue: {
            createTenantWithAdmin: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('test-token'),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    tenantService = module.get<TenantService>(TenantService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUserByEmail', () => {
    it('should return null if user not found', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      const result = await service.validateUserByEmail('nonexistent@example.com', 'password');
      expect(result).toBeNull();
    });

    it('should return null if password does not match', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      const result = await service.validateUserByEmail(mockUser.email, 'wrong_password');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return user and token', async () => {
      const result = await service.login(mockUser);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.token).toBe('test-token');
      expect(result.user).not.toHaveProperty('password');
    });

    it('should include tenantId in JWT payload', async () => {
      await service.login(mockUser);
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.id,
          tenantId: mockUser.tenantId,
        }),
      );
    });
  });
});
