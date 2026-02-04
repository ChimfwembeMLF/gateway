import { Module, forwardRef } from '@nestjs/common';
import { MtnService } from './mtn.service';
import { MtnController } from './mtn.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CollectionModule } from './collection/collection.module';
import { DisbursementModule } from './disbursement/disbursement.module';

@Module({
  imports: [HttpModule, ConfigModule, CollectionModule, forwardRef(() => DisbursementModule)],
  providers: [MtnService],
  controllers: [MtnController],
  exports: [MtnService],
})
export class MtnModule {}
