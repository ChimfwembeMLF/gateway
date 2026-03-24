import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Tenant } from '../tenant/entities/tenant.entity';
import { Payment } from '../payments/entities/payment.entity';
import { User } from '../user/entities/user.entity';
import { TenantModule } from '../tenant/tenant.module';

import { PaymentsModule } from '../payments/payments.module';
import { DisbursementsModule } from '../disbursements/disbursements.module';
import { MerchantConfigurationModule } from '../merchant';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Payment, User]),
    HttpModule,
    TenantModule,
    PaymentsModule,
    DisbursementsModule,
    MerchantConfigurationModule
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
