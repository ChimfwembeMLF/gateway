import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Payment } from '../src/modules/payments/entities/payment.entity';
import { Transaction } from '../src/modules/payments/entities/transaction.entity';
import { ConfigService } from '@nestjs/config';

export function typeOrmConfigFactory(configService: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: configService.get<string>('db.host'),
    port: configService.get<number>('db.port'),
    username: configService.get<string>('db.username'),
    password: configService.get<string>('db.password'),
    database: configService.get<string>('db.database'),
      entities: [
        process.env.NODE_ENV === 'production'
          ? __dirname + '/../modules/**/*.entity.js'
          : __dirname + '/../modules/**/*.entity.ts',
      ],
    synchronize: true, // Set to false in production
    migrations: [
      process.env.NODE_ENV === 'production'
        ? __dirname + '/migrations/*.js'
        : __dirname + '/migrations/*.ts',
    ],
  };
}
