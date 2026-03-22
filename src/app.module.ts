import { Module, MiddlewareConsumer, NestModule, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { loadYamlConfig } from './config/config.loader';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TransactionModule } from './modules/payments/transaction.module';
import { typeOrmConfigFactory } from './common/database/database.config';
import { AuditContextMiddleware } from './common/middleware/audit-context.middleware';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { TenantModule } from './modules/tenant/tenant.module';
import { HealthModule } from './modules/health/health.module';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingModule } from './modules/billing/billing.module';
import { StructuredLoggingService, RequestLoggingInterceptor } from './common/logging';
import { TenantThrottlerGuard } from './common/guards/tenant-throttler.guard';
import { UsageTrackingInterceptor } from './modules/billing/interceptors/usage-tracking.interceptor';
import { UsageMetricsService, BillingPlanSeedingService } from './modules/billing/services';
import { SettingsSeedingService } from './modules/settings/settings-seeding.service';
import { SettingsModule } from './modules/settings/settings.module';
import { EmailModule } from './modules/email/email.module';
import { MerchantConfigurationModule } from './modules/merchant/merchant.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AdminModule } from './modules/admin/admin.module';
import { DisbursementsModule } from './modules/disbursements/disbursements.module';
import { PawapayModule } from './modules/pawapay/pawapay.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [loadYamlConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: typeOrmConfigFactory,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ([{
        ttl: configService.get<number>('THROTTLE_TTL') || 60000, // 60 seconds
        limit: configService.get<number>('THROTTLE_LIMIT') || 100, // 100 requests per TTL
      }]),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    AdminModule,
    DashboardModule,
    SettingsModule,
    UserModule,
    PaymentsModule,
    TransactionModule,
    TenantModule,
    HealthModule,
    BillingModule,
    EmailModule,
    MerchantConfigurationModule,
    DisbursementsModule,
    PawapayModule,
  ],
  providers: [
    StructuredLoggingService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (usageMetricsService: UsageMetricsService) => {
        return new UsageTrackingInterceptor(usageMetricsService);
      },
      inject: [UsageMetricsService],
    },
    {
      provide: APP_GUARD,
      useClass: TenantThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule, OnApplicationBootstrap {
  constructor(
    private readonly billingPlanSeedingService: BillingPlanSeedingService,
    private readonly settingsSeedingService: SettingsSeedingService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Seed billing plans on startup
    await this.billingPlanSeedingService.seedBillingPlans();
    // Seed system settings on startup
    await this.settingsSeedingService.seedSettings();
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*')
      .apply(AuditContextMiddleware)
      .forRoutes('*');
  }
}
