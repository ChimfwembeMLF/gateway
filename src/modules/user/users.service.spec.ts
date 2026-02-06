import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockRepository: any;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    tenantId: 'tenant-123',
  };

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user by ID and tenant ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById('user-123', 'tenant-123');

      expect(result).toEqual(mockUser);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123', tenantId: 'tenant-123' },
      });
    });
  });

  describe('findAll', () => {
    it('should return all users for a tenant', async () => {
      const users = [mockUser];
      mockRepository.find.mockResolvedValue(users);

      const result = await service.findAll('tenant-123');

      expect(result).toEqual(users);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-123' },
      });
    });
  });
});
