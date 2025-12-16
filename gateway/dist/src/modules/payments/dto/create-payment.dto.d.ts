import { AbstractDto } from '../../../common/dtos/abstract.dto';
export declare class CreatePaymentDto extends AbstractDto {
    provider: string;
    amount: number;
    currency?: string;
    externalId: string;
    payer: string;
    payerMessage?: string;
    payeeNote?: string;
    bearerToken?: string;
    transactionId?: string;
}
