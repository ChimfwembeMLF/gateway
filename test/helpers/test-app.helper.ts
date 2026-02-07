import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as path from 'path';

/**
 * Creates a test NestJS application with in-memory database
 */
export async function createTestApp(
  imports: any[] = [],
  providers: any[] = [],
): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.TEST_DATABASE_HOST || 'localhost',
        port: parseInt(process.env.TEST_DATABASE_PORT || '5432'),
        username: process.env.TEST_DATABASE_USERNAME || 'postgres',
        password: process.env.TEST_DATABASE_PASSWORD || 'postgres',
        database: process.env.TEST_DATABASE_NAME || 'gateway_test',
        entities: [path.join(__dirname, '../../src/**/*.entity{.ts,.js}')],
        synchronize: true, // Auto-create schema for tests
        dropSchema: true, // Clean database before each test suite
      }),
      ...imports,
    ],
    providers,
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();
  return app;
}

/**
 * Sleep utility for async testing
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
