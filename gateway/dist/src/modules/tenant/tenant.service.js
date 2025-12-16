"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_entity_1 = require("./tenant.entity");
const users_service_1 = require("../user/users.service");
const role_type_enum_1 = require("../../common/enums/role-type.enum");
let TenantService = class TenantService {
    constructor(tenantRepository, usersService) {
        this.tenantRepository = tenantRepository;
        this.usersService = usersService;
    }
    async createTenantWithAdmin(dto) {
        const existing = await this.tenantRepository.findOne({ where: { name: dto.name } });
        if (existing)
            throw new common_1.BadRequestException('Tenant name already exists');
        const slug = dto.name.toLowerCase().replace(/\s+/g, '-');
        const tenant = this.tenantRepository.create({
            name: dto.name,
            slug,
            description: dto.description,
            isActive: true,
        });
        const savedTenant = await this.tenantRepository.save(tenant);
        const admin = await this.usersService.createUser({
            username: dto.adminUsername,
            password: dto.adminPassword,
            email: dto.adminEmail,
            role: role_type_enum_1.RoleType.ADMIN,
            tenantId: savedTenant.id,
        });
        return { tenant: savedTenant, admin };
    }
    async findAll() {
        return this.tenantRepository.find();
    }
    async findOne(id) {
        return this.tenantRepository.findOne({ where: { id } });
    }
    async update(id, data) {
        await this.tenantRepository.update(id, data);
        return this.findOne(id);
    }
    async deactivate(id) {
        await this.tenantRepository.update(id, { isActive: false });
        return this.findOne(id);
    }
    async remove(id) {
        await this.tenantRepository.delete(id);
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        users_service_1.UsersService])
], TenantService);
//# sourceMappingURL=tenant.service.js.map