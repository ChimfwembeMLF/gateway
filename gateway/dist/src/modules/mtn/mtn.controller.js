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
exports.MtnController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mtn_service_1 = require("./mtn.service");
const mtn_info_dto_1 = require("./dto/mtn-info.dto");
const auth_decorator_1 = require("../../common/decorators/auth.decorator");
let MtnController = class MtnController {
    constructor(mtnService) {
        this.mtnService = mtnService;
    }
    async createApiUser() {
        const result = await this.mtnService.createApiUser();
        return { success: true, data: result };
    }
    async createApiKey(referenceId) {
        const result = await this.mtnService.createApiKey(referenceId);
        return { success: true, data: result };
    }
    async createBearerToken(body) {
        const token = await this.mtnService.createBearerToken(body.referenceId, body.apiKey);
        return { success: true, data: { access_token: token } };
    }
    async requestToPay(body) {
        const result = await this.mtnService.requestToPay(body.dto, body.bearerToken, body.transactionId);
        return { success: true, data: result };
    }
    async getRequestToPayStatus(transactionId, bearerToken) {
        const result = await this.mtnService.getRequestToPayStatus(transactionId, bearerToken);
        return { success: true, data: result };
    }
    async getClientDetails(phone) {
        if (!/^(076|096)\d{7}$/.test(phone)) {
            throw new common_1.HttpException('Invalid phone number format', common_1.HttpStatus.BAD_REQUEST);
        }
        const data = await this.mtnService.fetchUserBasicDetails(phone);
        return { name: data.name, status: data.status, message: data.message };
    }
};
exports.MtnController = MtnController;
__decorate([
    (0, common_1.Post)('apiuser'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MtnController.prototype, "createApiUser", null);
__decorate([
    (0, common_1.Post)('apikey/:referenceId'),
    __param(0, (0, common_1.Param)('referenceId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MtnController.prototype, "createApiKey", null);
__decorate([
    (0, common_1.Post)('token'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MtnController.prototype, "createBearerToken", null);
__decorate([
    (0, common_1.Post)('requesttopay'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MtnController.prototype, "requestToPay", null);
__decorate([
    (0, common_1.Get)('requestopay/:transactionId/status'),
    __param(0, (0, common_1.Param)('transactionId')),
    __param(1, (0, common_1.Body)('bearerToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MtnController.prototype, "getRequestToPayStatus", null);
__decorate([
    (0, common_1.Get)('getClientDetails/:phone'),
    (0, swagger_1.ApiParam)({ name: 'phone', description: 'Zambian MTN mobile number', example: '0961234567' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: mtn_info_dto_1.MTNInfoResponseDto }),
    __param(0, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MtnController.prototype, "getClientDetails", null);
exports.MtnController = MtnController = __decorate([
    (0, swagger_1.ApiTags)('MTN'),
    (0, common_1.Controller)('api/v1/mtn'),
    (0, auth_decorator_1.Auth)(),
    __metadata("design:paramtypes", [mtn_service_1.MtnService])
], MtnController);
//# sourceMappingURL=mtn.controller.js.map