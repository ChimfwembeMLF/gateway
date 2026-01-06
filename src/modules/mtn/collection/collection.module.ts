import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../../payments/entities/payment.entity';
import { Transaction } from '../../payments/entities/transaction.entity';
import { CollectionService } from './collection.service';
import { CollectionCronJobs } from './collection.cron';
import { CollectionController } from './collection.controller';
import { MtnService } from '../mtn.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, Transaction]), ConfigModule, HttpModule],
  providers: [CollectionService, CollectionCronJobs, MtnService],
  controllers: [CollectionController],
  exports: [CollectionService],
})
export class CollectionModule {}
