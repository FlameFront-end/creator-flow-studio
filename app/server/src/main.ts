import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';
import { AppModule } from './app.module';

const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const resolveCorsOrigins = (): string[] => {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    return DEFAULT_CORS_ORIGINS;
  }

  if (raw === '*') {
    return ['*'];
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const corsOrigins = resolveCorsOrigins();
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
  });
  app.useStaticAssets(join(process.cwd(), 'storage'), {
    prefix: '/storage/',
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
