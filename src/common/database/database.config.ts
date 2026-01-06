// src/database/typeorm.config.ts

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { Tenant } from 'src/modules/tenant/entities/tenant.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Payment } from 'src/modules/payments/entities/payment.entity';
import { Transaction } from 'src/modules/payments/entities/transaction.entity';
import { UserSubscriber } from 'src/modules/user/user.subscriber';
import { TenantSubscriber } from 'src/modules/tenant/tenant.subscriber';

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
    entities: [Tenant, User, Payment, Transaction],
    subscribers: [UserSubscriber, TenantSubscriber],

    migrations: [join(__dirname, '/../migrations/*.{js,ts}')],

    synchronize: configService.get('NODE_ENV') !== 'production',
    logging: configService.get('NODE_ENV') !== 'production',
  };
}
