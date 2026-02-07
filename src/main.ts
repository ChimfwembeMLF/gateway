
import * as crypto from 'crypto';
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = crypto;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger/swagger.setup';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const port = process.env.PORT ?? 3000;
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  // Security middleware
  app.use(helmet());
  app.enableCors({
    // origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:3001').split(','),
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-tenant-id'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  setupSwagger(app);
  await app.listen(port);
  logger.log(`🚀 Application running on port ${port} (${nodeEnv} mode)`);
  logger.log(`📚 API Documentation: http://localhost:${port}/documentation`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
