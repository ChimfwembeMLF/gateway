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
import * as dotenv from 'dotenv';

// Load environment variables for CLI commands
dotenv.config();

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

    // This is the important part
    // entities: [join(__dirname, '/../**/*.entity.{js,ts}')],
    entities: [Tenant, User, Payment, Transaction, Audit],
    subscribers: [UserSubscriber, TenantSubscriber, AuditSubscriber],

    migrations: [join(__dirname, '/migrations/*.{js,ts}')],

    synchronize: false,
    logging: configService.get('NODE_ENV') === 'development',
  };
}

// DataSource for TypeORM CLI (migrations)
const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'gateway',
  entities: [Tenant, User, Payment, Transaction, Audit],
  subscribers: [UserSubscriber, TenantSubscriber, AuditSubscriber],
  migrations: [join(__dirname, '/migrations/*.{js,ts}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

export default new DataSource(dataSourceOptions);
