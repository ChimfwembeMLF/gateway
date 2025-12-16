import { AbstractDto } from '../../../common/dtos/abstract.dto';
export declare class RequestToPayDto extends AbstractDto {
    amount: number;
    currency: string;
    externalId: string;
    payer: string;
    payerMessage: string;
    payeeNote: string;
}
