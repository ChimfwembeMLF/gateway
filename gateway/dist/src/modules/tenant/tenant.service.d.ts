import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { UsersService } from '../user/users.service';
import { CreateTenantWithAdminDto } from './dto/create-tenant-with-admin.dto';
import { User } from '../user/entities/user.entity';
export declare class TenantService {
    private readonly tenantRepository;
    private readonly usersService;
    constructor(tenantRepository: Repository<Tenant>, usersService: UsersService);
    createTenantWithAdmin(dto: CreateTenantWithAdminDto): Promise<{
        tenant: Tenant;
        admin: User;
    }>;
    findAll(): Promise<Tenant[]>;
    findOne(id: string): Promise<Tenant | null>;
    update(id: string, data: Partial<Tenant>): Promise<Tenant | null>;
    deactivate(id: string): Promise<Tenant | null>;
    remove(id: string): Promise<void>;
}
