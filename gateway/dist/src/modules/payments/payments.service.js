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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_entity_1 = require("./entities/payment.entity");
const mtn_service_1 = require("../mtn/mtn.service");
let PaymentsService = class PaymentsService {
    constructor(paymentRepository, mtnService) {
        this.paymentRepository = paymentRepository;
        this.mtnService = mtnService;
    }
    async create(createPaymentDto) {
        let providerResult;
        switch (createPaymentDto.provider.toLowerCase()) {
            case 'mtn':
                providerResult = await this.mtnService.requestToPay(createPaymentDto, createPaymentDto.bearerToken || '', createPaymentDto.transactionId || '');
                break;
            default:
                throw new common_1.BadRequestException('Unsupported provider');
        }
        const payment = this.paymentRepository.create({
            ...createPaymentDto,
            status: payment_entity_1.PaymentStatus.PENDING,
            momoTransactionId: providerResult?.transactionId || null,
            tenantId: createPaymentDto.tenantId,
        });
        return this.paymentRepository.save(payment);
    }
    async findOne(id, tenantId) {
        const payment = await this.paymentRepository.findOne({ where: { id, tenantId } });
        if (!payment)
            throw new common_1.NotFoundException('Payment not found');
        return payment;
    }
    async updateStatus(id, status, tenantId) {
        const payment = await this.findOne(id, tenantId);
        payment.status = status;
        return this.paymentRepository.save(payment);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(payment_entity_1.Payment)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        mtn_service_1.MtnService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map