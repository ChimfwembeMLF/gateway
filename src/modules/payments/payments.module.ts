import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Transaction } from './entities/transaction.entity';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsStatusCronService } from './payments-status-cron.service';
import { StalePaymentsCleanupService } from './stale-payments-cleanup.service';
import { UuidGeneratorService } from './external-id.service';
import { UserModule } from '../user/user.module';
import { TenantModule } from '../tenant/tenant.module';
import { TransactionModule } from './transaction.module';
import { forwardRef } from '@nestjs/common';
import { PawapayModule } from '../pawapay/pawapay.module';

@Module({
    imports: [TypeOrmModule.forFeature([Payment, Transaction]), UserModule, TenantModule, TransactionModule, forwardRef(() => PawapayModule)],
    controllers: [PaymentsController],
    providers: [
        PaymentsService,
        UuidGeneratorService,
        PaymentsStatusCronService,
        StalePaymentsCleanupService
    ],
    exports: [PaymentsService, UuidGeneratorService],
})
export class PaymentsModule { }