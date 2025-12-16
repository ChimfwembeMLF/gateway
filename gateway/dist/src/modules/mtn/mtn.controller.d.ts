import { MtnService } from './mtn.service';
import { MTNInfoResponseDto } from './dto/mtn-info.dto';
import { BaseResponseDto } from '../../common/dtos/base-response.dto';
import { RequestToPayDto } from './dto/request-to-pay.dto';
export declare class MtnController {
    private readonly mtnService;
    constructor(mtnService: MtnService);
    createApiUser(): Promise<BaseResponseDto>;
    createApiKey(referenceId: string): Promise<BaseResponseDto>;
    createBearerToken(body: {
        referenceId: string;
        apiKey: string;
    }): Promise<BaseResponseDto>;
    requestToPay(body: {
        dto: RequestToPayDto;
        bearerToken: string;
        transactionId: string;
    }): Promise<BaseResponseDto>;
    getRequestToPayStatus(transactionId: string, bearerToken: string): Promise<BaseResponseDto>;
    getClientDetails(phone: string): Promise<MTNInfoResponseDto>;
}
