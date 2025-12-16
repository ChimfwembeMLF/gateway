import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantService } from './tenant.service';
import { CreateTenantWithAdminDto } from './dto/create-tenant-with-admin.dto';
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    createTenantWithAdmin(dto: CreateTenantWithAdminDto): Promise<{
        tenant: import("./tenant.entity").Tenant;
        admin: import("../user/entities/user.entity").User;
    }>;
    findAll(): Promise<import("./tenant.entity").Tenant[]>;
    findOne(id: string): Promise<import("./tenant.entity").Tenant | null>;
    update(id: string, dto: UpdateTenantDto): Promise<import("./tenant.entity").Tenant | null>;
    deactivate(id: string): Promise<import("./tenant.entity").Tenant | null>;
    remove(id: string): Promise<{
        success: boolean;
    }>;
}
