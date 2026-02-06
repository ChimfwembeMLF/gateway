import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RoleType } from 'src/common/enums/role-type.enum';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}


  async findByUsername(username: string, tenantId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username, tenantId } });
  }

  async findById(id: string, tenantId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id, tenantId } });
  }


  async createUser(data: Partial<User> & { tenantId: string }): Promise<User> {
    // Ensure username is unique per tenant
    if (!data.tenantId) {
      throw new Error('tenantId is required');
    }
    const existing = await this.userRepository.findOne({ where: { username: data.username, tenantId: data.tenantId } });
    if (existing) {
      throw new Error('Username must be unique within tenant');
    }
    // Password hashing is now handled by UserSubscriber
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findAll(tenantId: string): Promise<User[]> {
    return this.userRepository.find({ where: { tenantId } });
  }


  async update(id: string, data: Partial<User>, tenantId: string): Promise<User | null> {
    await this.userRepository.update({ id, tenantId }, data);
    return this.findById(id, tenantId);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByUsernameOrEmail(username: string, email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: [{ username }, { email }] });
  }

  async createTenantAndAdmin(data: { tenantName: string; description?: string; adminUsername: string; adminEmail: string; adminPassword: string; }): Promise<{ tenant: any; admin: User }> {
    // Create tenant entity
    // This is a placeholder, actual implementation should use TenantService
    // For now, just return mock objects
    const tenant = { name: data.tenantName, description: data.description };
    const admin = await this.createUser({
      username: data.adminUsername,
      email: data.adminEmail,
      password: data.adminPassword,
      role: RoleType.ADMIN,
      tenantId: data.adminUsername,
    });
    return { tenant, admin };
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.userRepository.delete({ id, tenantId });
  }
}
