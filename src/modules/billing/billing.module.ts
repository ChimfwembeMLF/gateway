import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BillingPlan,
  TenantBillingSubscription,
  UsageMetrics,
  Invoice,
  InvoiceLineItem,
} from './entities';
import { Tenant } from '../tenant/entities/tenant.entity';
import {
  BillingLimitService,
  UsageMetricsService,
  InvoiceService,
  PdfGeneratorService,
  BillingPlanSeedingService,
  BillingScheduledJobsService,
} from './services';
import { BillingPlanSeeder } from './seeders/billing-plan.seeder';
import { BillingController } from './billing.controller';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BillingPlan,
      TenantBillingSubscription,
      UsageMetrics,
      Invoice,
      InvoiceLineItem,
      Tenant,
    ]),
    EmailModule,
  ],
  controllers: [BillingController],
  providers: [
    BillingLimitService,
    UsageMetricsService,
    InvoiceService,
    PdfGeneratorService,
    BillingPlanSeedingService,
    BillingScheduledJobsService,
    BillingPlanSeeder,
  ],
  exports: [
    BillingLimitService,
    UsageMetricsService,
    InvoiceService,
    PdfGeneratorService,
    BillingPlanSeedingService,
    BillingScheduledJobsService,
    BillingPlanSeeder,
  ],
})
export class BillingModule {}
