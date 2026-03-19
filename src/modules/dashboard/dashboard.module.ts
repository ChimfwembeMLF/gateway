import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Payment } from '../payments/entities/payment.entity';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Payment, User])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
