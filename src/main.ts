import * as crypto from 'crypto';
(global as any).crypto = crypto;

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { setupSwagger } from './swagger/swagger.setup';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
  console.log(`System running at http://localhost:${process.env.PORT ?? 3000}/documentation`)
}
bootstrap();
