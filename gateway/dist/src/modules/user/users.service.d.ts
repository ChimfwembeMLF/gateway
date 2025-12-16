import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
export declare class UsersService {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    findByUsername(username: string, tenantId: string): Promise<User | null>;
    findById(id: string, tenantId: string): Promise<User | null>;
    createUser(data: Partial<User> & {
        tenantId: string;
    }): Promise<User>;
    generateApiKeyForUser(userId: string, tenantId: string): Promise<string>;
    findAll(tenantId: string): Promise<User[]>;
    update(id: string, data: Partial<User>, tenantId: string): Promise<User | null>;
    remove(id: string, tenantId: string): Promise<void>;
}
