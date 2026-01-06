import { Module } from '@nestjs/common';
import { MtnService } from './mtn.service';
import { MtnController } from './mtn.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CollectionModule } from './collection/collection.module';

@Module({
  imports: [HttpModule, ConfigModule, CollectionModule],
  providers: [MtnService],
  controllers: [MtnController],
  exports: [MtnService],
})
export class MtnModule {}
