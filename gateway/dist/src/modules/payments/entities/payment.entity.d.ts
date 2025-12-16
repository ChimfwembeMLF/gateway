import { AbstractEntity } from '../../../common/entities/abstract.entity';
export declare enum PaymentStatus {
    PENDING = "PENDING",
    SUCCESSFUL = "SUCCESSFUL",
    FAILED = "FAILED"
}
export declare class Payment extends AbstractEntity {
    tenantId: string;
    amount: number;
    currency: string;
    externalId: string;
    payer: string;
    payerMessage: string;
    payeeNote: string;
    status: PaymentStatus;
    momoTransactionId: string;
}
