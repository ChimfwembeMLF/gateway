import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Transaction } from './entities/transaction.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsStatusCronService } from './payments-status-cron.service';
import { StalePaymentsCleanupService } from './stale-payments-cleanup.service';
import { UuidGeneratorService } from './external-id.service';
import { MtnModule } from '../mtn/mtn.module';
import { CollectionService } from '../mtn/collection/collection.service';
import { DisbursementModule } from '../mtn/disbursement/disbursement.module';
import { UserModule } from '../user/user.module';
import { TenantModule } from '../tenant/tenant.module';

@Module({
    imports: [TypeOrmModule.forFeature([Payment, Transaction]), MtnModule, DisbursementModule, UserModule, TenantModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, CollectionService, UuidGeneratorService, PaymentsStatusCronService, StalePaymentsCleanupService],
    exports: [PaymentsService, UuidGeneratorService],
})
export class PaymentsModule {}