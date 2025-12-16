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
var MtnService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MtnService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const axios_2 = require("axios");
const config_1 = require("@nestjs/config");
let MtnService = MtnService_1 = class MtnService {
    constructor(mtnHttpService, configService) {
        this.mtnHttpService = mtnHttpService;
        this.configService = configService;
        this.logger = new common_1.Logger(MtnService_1.name);
    }
    async createApiUser() {
        const mtn = this.configService.get('mtn');
        const subscriptionKey = mtn.subscription_key;
        const referenceId = this.generateReferenceId();
        const url = `${mtn.base}/v1_0/apiuser`;
        try {
            await axios_2.default.post(url, { providerCallbackHost: 'https://webhook.site/placeholder' }, {
                headers: {
                    'X-Reference-Id': referenceId,
                    'Ocp-Apim-Subscription-Key': subscriptionKey,
                },
            });
            return { success: true, referenceId };
        }
        catch (error) {
            this.logger.error('createApiUser error', error.message);
            throw new common_1.BadRequestException('Failed to create API user');
        }
    }
    async createApiKey(referenceId) {
        const mtn = this.configService.get('mtn');
        const subscriptionKey = mtn.subscription_key;
        const url = `${mtn.base}/v1_0/apiuser/${referenceId}/apikey`;
        try {
            const response = await axios_2.default.post(url, null, {
                headers: {
                    'Ocp-Apim-Subscription-Key': subscriptionKey,
                },
            });
            return { apiKey: response.data.apiKey };
        }
        catch (error) {
            this.logger.error('createApiKey error', error.message);
            throw new common_1.BadRequestException('Failed to create API key');
        }
    }
    async createBearerToken(referenceId, apiKey) {
        const mtn = this.configService.get('mtn');
        const subscriptionKey = mtn.subscription_key;
        const targetEnvironment = mtn.target_environment;
        const url = `${mtn.base}/token/`;
        const auth = Buffer.from(`${referenceId}:${apiKey}`).toString('base64');
        try {
            const response = await axios_2.default.post(url, null, {
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Ocp-Apim-Subscription-Key': subscriptionKey,
                    'X-Target-Environment': targetEnvironment,
                },
            });
            return response.data.access_token;
        }
        catch (error) {
            this.logger.error('createBearerToken error', error.message);
            throw new common_1.BadRequestException('Failed to get bearer token');
        }
    }
    async requestToPay(dto, bearerToken, transactionId) {
        const mtn = this.configService.get('mtn');
        const subscriptionKey = mtn.subscription_key;
        const targetEnvironment = mtn.target_environment;
        const url = `${mtn.base}/collection/v1_0/requesttopay`;
        try {
            await axios_2.default.post(url, {
                amount: dto.amount,
                currency: dto.currency,
                externalId: dto.externalId,
                payer: { partyIdType: 'MSISDN', partyId: dto.payer },
                payerMessage: dto.payerMessage,
                payeeNote: dto.payeeNote,
            }, {
                headers: {
                    'Ocp-Apim-Subscription-Key': subscriptionKey,
                    'X-Target-Environment': targetEnvironment,
                    'X-Reference-Id': transactionId,
                    Authorization: `Bearer ${bearerToken}`,
                },
            });
            return { success: true, transactionId };
        }
        catch (error) {
            this.logger.error('requestToPay error', error.message);
            throw new common_1.BadRequestException('Failed to request to pay');
        }
    }
    async getRequestToPayStatus(transactionId, bearerToken) {
        const mtn = this.configService.get('mtn');
        const subscriptionKey = mtn.subscription_key;
        const targetEnvironment = mtn.target_environment;
        const url = `${mtn.base}/collection/v1_0/requesttopay/${transactionId}`;
        try {
            const response = await axios_2.default.get(url, {
                headers: {
                    'Ocp-Apim-Subscription-Key': subscriptionKey,
                    'X-Target-Environment': targetEnvironment,
                    'X-Reference-Id': transactionId,
                    Authorization: `Bearer ${bearerToken}`,
                },
            });
            return response.data;
        }
        catch (error) {
            this.logger.error('getRequestToPayStatus error', error.message);
            throw new common_1.BadRequestException('Failed to get request to pay status');
        }
    }
    async fetchUserBasicDetails(mobileNumber) {
        try {
            const mtn = this.configService.get('mtn');
            const paddedMomoNumber = mobileNumber.startsWith('26') ? mobileNumber : `26${mobileNumber.slice(1)}`;
            const token = await this.createMtnToken();
            const url = `${mtn.base}/v1_0/accountholder/MSISDN/${paddedMomoNumber}/basicuserinfo`;
            const response = await axios_2.default.get(url, {
                headers: {
                    'X-Reference-Id': mtn.x_reference_id,
                    'Ocp-Apim-Subscription-Key': mtn.subscription_key,
                    'X-Target-Environment': mtn.target_environment,
                    Authorization: `Bearer ${token}`,
                },
            });
            this.logger.debug('fetchUserBasicDetails response');
            return response.data;
        }
        catch (error) {
            this.logger.error('fetchUserBasicDetails error', error.message);
            throw new common_1.BadRequestException(error.message || 'Failed to fetch user details');
        }
    }
    async getMtnUserInfo(phone) {
        try {
            const link = this.configService.get('olympus.link') ?? '';
            if (!link) {
                this.logger.error('OlympusTech link not configured');
                throw new common_1.InternalServerErrorException('OlympusTech link not configured');
            }
            const url = `${link}PhoneNumber=${encodeURIComponent(phone)}`;
            const response = await axios_2.default.get(url);
            return response.data;
        }
        catch (error) {
            this.logger.error('getMtnUserInfo error', error.message);
            throw new common_1.InternalServerErrorException(error.message || 'Failed to fetch MTN user info');
        }
    }
    async createMtnToken() {
        try {
            const mtn = this.configService.get('mtn');
            const username = mtn.x_reference_id;
            const apiKey = mtn.api_key;
            const authString = `${username}:${apiKey}`;
            const url = `${mtn.base}/token/`;
            const response = await axios_2.default.post(url, {}, {
                headers: {
                    'Ocp-Apim-Subscription-Key': mtn.subscription_key,
                    'X-Target-Environment': mtn.target_environment,
                    Authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
                },
            });
            this.logger.debug('createMtnToken response');
            return response?.data?.access_token;
        }
        catch (error) {
            this.logger.error('createMtnToken error', error.message);
            throw new common_1.BadRequestException(error.message || 'Failed to create MTN token');
        }
    }
    generateReferenceId() {
        try {
            const { randomUUID } = require('crypto');
            return randomUUID();
        }
        catch {
            return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }
    }
};
exports.MtnService = MtnService;
exports.MtnService = MtnService = MtnService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService,
        config_1.ConfigService])
], MtnService);
//# sourceMappingURL=mtn.service.js.map