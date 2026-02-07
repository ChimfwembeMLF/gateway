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
import { WebhookLog } from './entities/webhook-log.entity';
import {
  WebhookValidatorService,
  WebhookDeduplicationService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Transaction, WebhookLog]),
    ConfigModule,
    HttpModule,
  ],
  providers: [
    CollectionService,
    CollectionCronJobs,
    MtnService,
    WebhookValidatorService,
    WebhookDeduplicationService,
  ],
  controllers: [CollectionController],
  exports: [CollectionService, WebhookValidatorService, WebhookDeduplicationService],
})
export class CollectionModule {}
