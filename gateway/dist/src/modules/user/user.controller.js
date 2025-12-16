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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const users_service_1 = require("./users.service");
const user_dto_1 = require("./dto/user.dto");
const register_dto_1 = require("../auth/dto/register.dto");
const api_key_guard_1 = require("../../common/guards/api-key.guard");
let UserController = class UserController {
    constructor(userService) {
        this.userService = userService;
    }
    async findAll(req) {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenantId in request.');
        const users = await this.userService.findAll(tenantId);
        return users.map(u => new user_dto_1.UserDto(u));
    }
    async findOne(id, req) {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenantId in request.');
        const user = await this.userService.findById(id, tenantId);
        if (!user)
            throw new common_1.ForbiddenException('User not found or access denied.');
        return new user_dto_1.UserDto(user);
    }
    async create(data, req) {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenantId in request.');
        const user = await this.userService.createUser({ ...data, tenantId });
        return new user_dto_1.UserDto(user);
    }
    async update(id, data, req) {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenantId in request.');
        const user = await this.userService.update(id, data, tenantId);
        if (!user)
            throw new common_1.ForbiddenException('User not found or access denied.');
        return new user_dto_1.UserDto(user);
    }
    async remove(id, req) {
        const tenantId = req.user?.tenantId;
        if (!tenantId)
            throw new common_1.BadRequestException('Missing tenantId in request.');
        await this.userService.remove(id, tenantId);
    }
    async generateApiKey(id, req) {
        const tenantId = req.user.tenantId;
        const apiKey = await this.userService.generateApiKeyForUser(id, tenantId);
        return { apiKey };
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all users' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [user_dto_1.UserDto] }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user by ID' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new user' }),
    (0, swagger_1.ApiResponse)({ status: 201, type: user_dto_1.UserDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update user' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, type: user_dto_1.UserDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete user' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String }),
    (0, swagger_1.ApiResponse)({ status: 204 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/generate-api-key'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate new API key for user' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: String }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'API key generated', schema: { type: 'object', properties: { apiKey: { type: 'string' } } } }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "generateApiKey", null);
exports.UserController = UserController = __decorate([
    (0, swagger_1.ApiTags)('Users'),
    (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard),
    (0, common_1.Controller)('api/v1/users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UserController);
//# sourceMappingURL=user.controller.js.map