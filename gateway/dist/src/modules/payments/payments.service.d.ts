import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { MtnService } from '../mtn/mtn.service';
export declare class PaymentsService {
    private readonly paymentRepository;
    private readonly mtnService;
    constructor(paymentRepository: Repository<Payment>, mtnService: MtnService);
    create(createPaymentDto: CreatePaymentDto & {
        tenantId: string;
    }): Promise<Payment>;
    findOne(id: string, tenantId: string): Promise<Payment>;
    updateStatus(id: string, status: PaymentStatus, tenantId: string): Promise<Payment>;
}
