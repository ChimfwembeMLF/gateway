// src/database/typeorm.config.ts

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { Tenant } from 'src/modules/tenant/entities/tenant.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Transaction } from 'src/modules/payments/entities/transaction.entity';
import { UserSubscriber } from 'src/modules/user/user.subscriber';
import { TenantSubscriber } from 'src/modules/tenant/tenant.subscriber';
import { Audit } from 'src/modules/audit/entities/audit.entity';
import { AuditSubscriber } from 'src/modules/audit/audit.subscriber';
import { IdempotencyKey } from 'src/modules/payments/idempotency/idempotency-key.entity';
import { Disbursement } from 'src/modules/disbursements/entities/disbursement.entity';
import { WebhookLog } from 'src/modules/mtn/collection/entities/webhook-log.entity';
import { BillingPlan, TenantBillingSubscription, UsageMetrics, Invoice, InvoiceLineItem } from 'src/modules/billing/entities';
import { MerchantConfiguration } from 'src/modules/merchant/entities/merchant-configuration.entity';

export function typeOrmConfigFactory(
  configService: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: configService.get<string>('db.host'),
    port: configService.get<number>('db.port'),
    username: configService.get<string>('db.username'),
    password: configService.get<string>('db.password'),
    database: configService.get<string>('db.database'),
    entities: [Tenant, User, Payment, Transaction, Audit, IdempotencyKey, Disbursement, WebhookLog, BillingPlan, TenantBillingSubscription, UsageMetrics, Invoice, InvoiceLineItem, MerchantConfiguration],
    subscribers: [UserSubscriber, TenantSubscriber, AuditSubscriber],
    migrations: [join(__dirname, '/migrations/*.{js,ts}')],
    synchronize: true,
    logging: true,
  };
}

// DataSource for TypeORM CLI (migrations)
const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'db',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'gateway',
  entities: [Tenant, User, Payment, Transaction, Audit, IdempotencyKey, Disbursement, WebhookLog, BillingPlan, TenantBillingSubscription, UsageMetrics, Invoice, InvoiceLineItem, MerchantConfiguration],
  subscribers: [UserSubscriber, TenantSubscriber, AuditSubscriber],
  migrations: [join(__dirname, '/migrations/*.{js,ts}')],
  synchronize: true,
  logging: true,
};

export default new DataSource(dataSourceOptions);
