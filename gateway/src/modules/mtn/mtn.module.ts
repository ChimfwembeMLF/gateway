import { Module } from '@nestjs/common';
import { MtnService } from './mtn.service';
import { MtnController } from './mtn.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [MtnService],
  // controllers: [MtnController],
  exports: [MtnService],
})
export class MtnModule {}
