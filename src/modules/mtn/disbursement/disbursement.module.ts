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

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Transaction]), ConfigModule, HttpModule, forwardRef(() => MtnModule)],
  providers: [DisbursementService],
  controllers: [DisbursementController],
  exports: [DisbursementService],
})
export class DisbursementModule {}
