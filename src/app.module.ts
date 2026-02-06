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
import { MtnModule } from './modules/mtn/mtn.module';
import { BillingModule } from './modules/billing/billing.module';
import { StructuredLoggingService, RequestLoggingInterceptor } from './common/logging';
import { TenantThrottlerGuard } from './common/guards/tenant-throttler.guard';
import { UsageTrackingInterceptor } from './modules/billing/interceptors/usage-tracking.interceptor';
import { UsageMetricsService, BillingPlanSeedingService } from './modules/billing/services';
import { EmailModule } from './modules/email/email.module';
import { DisbursementsModule } from './modules/disbursements/disbursements.module';

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
    UserModule,
    PaymentsModule,
    TransactionModule,
    TenantModule,
    HealthModule,
    MtnModule,
    BillingModule,
    EmailModule,
    DisbursementsModule,
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
  constructor(private readonly billingPlanSeedingService: BillingPlanSeedingService) {}

  async onApplicationBootstrap(): Promise<void> {
    // Seed billing plans on startup
    await this.billingPlanSeedingService.seedBillingPlans();
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*')
      .apply(AuditContextMiddleware)
      .forRoutes('*');
  }
}
