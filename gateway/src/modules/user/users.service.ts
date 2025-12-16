import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { randomBytes } from 'crypto';
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
    // Generate API key if not present
    if (!data.apiKey) {
      data.apiKey = randomBytes(32).toString('hex');
    }
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async generateApiKeyForUser(userId: string, tenantId: string): Promise<string> {
    const apiKey = randomBytes(32).toString('hex');
    await this.userRepository.update({ id: userId, tenantId }, { apiKey });
    return apiKey;
  }


  async findAll(tenantId: string): Promise<User[]> {
    return this.userRepository.find({ where: { tenantId } });
  }


  async update(id: string, data: Partial<User>, tenantId: string): Promise<User | null> {
    await this.userRepository.update({ id, tenantId }, data);
    return this.findById(id, tenantId);
  }


  async remove(id: string, tenantId: string): Promise<void> {
    await this.userRepository.delete({ id, tenantId });
  }
}
