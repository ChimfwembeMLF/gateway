import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { Transaction } from '../../payments/entities/transaction.entity';
import { DisbursementService } from './disbursement.service';
import { DisbursementController } from './disbursement.controller';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { forwardRef } from '@nestjs/common';
import { MtnModule } from '../mtn.module';
import { Disbursement, DisbursementTransaction } from './entities';
import { BalanceValidationService, DisbursementErrorHandler } from './services';
import { IdempotencyKey } from '../../payments/idempotency/idempotency-key.entity';
import { IdempotencyService } from '../../payments/idempotency/idempotency.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Transaction,
      Disbursement,
      DisbursementTransaction,
      IdempotencyKey,
    ]),
    ConfigModule,
    HttpModule,
    forwardRef(() => MtnModule),
  ],
  providers: [
    DisbursementService,
    BalanceValidationService,
    DisbursementErrorHandler,
    IdempotencyService,
  ],
  controllers: [DisbursementController],
  exports: [DisbursementService, BalanceValidationService],
})
export class DisbursementModule {}
