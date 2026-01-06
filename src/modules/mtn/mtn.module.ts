import { Module } from '@nestjs/common';
import { MtnService } from './mtn.service';
import { MtnController } from './mtn.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CollectionController } from './collection/collection.controller';
import { CollectionService } from './collection/collection.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [MtnService, CollectionService],
  controllers: [MtnController, CollectionController],
  exports: [MtnService, CollectionService],
})
export class MtnModule {}
