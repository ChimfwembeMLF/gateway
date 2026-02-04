
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
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
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    PaymentsModule,
    TransactionModule,
    TenantModule,
    HealthModule,
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
