import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { Transaction } from './entities/transaction.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { MtnModule } from '../mtn/mtn.module';
import { CollectionService } from '../mtn/collection/collection.service';
import { UserModule } from '../user/user.module';

@Module({
    imports: [TypeOrmModule.forFeature([Payment, Transaction]), MtnModule,UserModule],
    controllers: [PaymentsController],
    providers: [PaymentsService, CollectionService],
    exports: [PaymentsService],
})
export class PaymentsModule {}