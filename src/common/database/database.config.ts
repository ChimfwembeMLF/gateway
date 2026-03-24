import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';

import { Tenant } from 'src/modules/tenant/entities/tenant.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Transaction } from 'src/modules/payments/entities/transaction.entity';
import { Disbursement } from 'src/modules/disbursements/entities/disbursement.entity';

import { Audit } from 'src/modules/audit/entities/audit.entity';
import { IdempotencyKey } from 'src/modules/payments/idempotency/idempotency-key.entity';

import {
  BillingPlan,
  TenantBillingSubscription,
  UsageMetrics,
  Invoice,
  InvoiceLineItem,
} from 'src/modules/billing/entities';

import { MerchantConfiguration } from 'src/modules/merchant/entities/merchant-configuration.entity';
import { Settings } from 'src/modules/settings/entities/settings.entity';

import { UserSubscriber } from 'src/modules/user/user.subscriber';
import { TenantSubscriber } from 'src/modules/tenant/tenant.subscriber';
import { AuditSubscriber } from 'src/modules/audit/audit.subscriber';

dotenv.config();

/**
 * Entities
 */
const entities = [
  Tenant,
  User,
  Payment,
  Transaction,
  Disbursement,
  Audit,
  IdempotencyKey,
  BillingPlan,
  TenantBillingSubscription,
  UsageMetrics,
  Invoice,
  InvoiceLineItem,
  MerchantConfiguration,
  Settings,
];

/**
 * Subscribers
 */
const subscribers = [UserSubscriber, TenantSubscriber, AuditSubscriber];

/**
 * NestJS TypeORM Config (used in AppModule)
 */
export function typeOrmConfigFactory(
  configService: ConfigService,
): TypeOrmModuleOptions {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  return {
    type: 'postgres',

    host: configService.get<string>('DATABASE_HOST'),
    port: configService.get<number>('DATABASE_PORT'),

    username: configService.get<string>('DATABASE_USERNAME'),
    password: configService.get<string>('DATABASE_PASSWORD'),
    database: configService.get<string>('DATABASE_NAME'),

    entities,
    subscribers,

    migrations: [join(__dirname, '/migrations/*.{ts,js}')],

    synchronize: configService.get<boolean>('DATABASE_SYNCHRONIZE'),

    logging: !isProduction,

    migrationsRun: false,

    extra: {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  };
}

/**
 * DataSource for TypeORM CLI (migrations)
 */
const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',

  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT),

  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,

  entities,
  subscribers,

  migrations: [join(__dirname, '/migrations/*.{ts,js}')],

  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',

  logging: process.env.NODE_ENV !== 'production',

  extra: {
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};

export default new DataSource(dataSourceOptions);