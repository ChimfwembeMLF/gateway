import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*')
      .apply(AuditContextMiddleware)
      .forRoutes('*');
  }
}
