import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
export declare class MtnService {
    private readonly mtnHttpService;
    private readonly configService;
    private readonly logger;
    constructor(mtnHttpService: HttpService, configService: ConfigService);
    createApiUser(): Promise<{
        success: boolean;
        referenceId: string;
    }>;
    createApiKey(referenceId: string): Promise<{
        apiKey: string;
    }>;
    createBearerToken(referenceId: string, apiKey: string): Promise<string>;
    requestToPay(dto: any, bearerToken: string, transactionId: string): Promise<{
        success: boolean;
        transactionId: string;
    }>;
    getRequestToPayStatus(transactionId: string, bearerToken: string): Promise<any>;
    fetchUserBasicDetails(mobileNumber: string): Promise<any>;
    getMtnUserInfo(phone: string): Promise<any>;
    createMtnToken(): Promise<string>;
    private generateReferenceId;
}
