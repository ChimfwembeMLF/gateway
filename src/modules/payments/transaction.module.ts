import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionService } from './transaction.service';
import { IdempotencyKey } from './idempotency/idempotency-key.entity';
import { IdempotencyService } from './idempotency/idempotency.service';
import { IdempotencyInterceptor } from './idempotency/idempotency.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, IdempotencyKey])],
  providers: [TransactionService, IdempotencyService, IdempotencyInterceptor],
  exports: [TransactionService, IdempotencyService, IdempotencyInterceptor],
})
export class TransactionModule {}
