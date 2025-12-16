import { Payment } from './payment.entity';
import { AbstractEntity } from '../../../common/entities/abstract.entity';
export declare enum TransactionType {
    REQUEST_TO_PAY = "REQUEST_TO_PAY",
    STATUS_QUERY = "STATUS_QUERY"
}
export declare class Transaction extends AbstractEntity {
    tenantId: string;
    payment: Payment;
    type: TransactionType;
    momoReferenceId: string;
    response: string;
    status: string;
}
