import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthCheckService } from './health-check.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [HealthCheckService],
  controllers: [HealthController],
  exports: [HealthCheckService],
})
export class HealthModule {}
