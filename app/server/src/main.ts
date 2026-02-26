import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { AppLogger } from './common/logging/app-logger';

const DEFAULT_CORS_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const DEFAULT_SWAGGER_PATH = 'swagger';

const resolveCorsOrigins = (): string[] => {
  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase() ?? 'development';
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) {
    return DEFAULT_CORS_ORIGINS;
  }

  const origins =
    raw === '*'
      ? ['*']
      : raw
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);

  if (nodeEnv === 'production' && origins.includes('*')) {
    throw new Error(
      'CORS_ORIGIN wildcard "*" is not allowed in production. Set explicit allowed origins.',
    );
  }

  return origins;
};

const resolveSwaggerPath = (): string => {
  const raw = process.env.SWAGGER_PATH?.trim();
  if (!raw) {
    return DEFAULT_SWAGGER_PATH;
  }

  const normalized = raw.replace(/^\/+/, '').replace(/\/+$/, '');
  return normalized || DEFAULT_SWAGGER_PATH;
};

const resolveTrustProxy = (): boolean | number | string | string[] => {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) {
    return false;
  }

  const normalized = raw.toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  const asNumber = Number(raw);
  if (Number.isInteger(asNumber) && asNumber >= 0) {
    return asNumber;
  }

  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return raw;
};

const normalizeBaseUrlForLogs = (value: string): string => {
  try {
    const parsed = new URL(value);
    if (
      parsed.hostname === '0.0.0.0' ||
      parsed.hostname === '::' ||
      parsed.hostname === '[::]' ||
      parsed.hostname === '::1' ||
      parsed.hostname === '[::1]'
    ) {
      parsed.hostname = 'localhost';
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return value.replace(/\/$/, '');
  }
};

const setupSwagger = (
  app: NestExpressApplication,
): { uiPath: string; jsonPath: string } => {
  const swaggerPath = resolveSwaggerPath();
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Creator Flow Studio API')
    .setDescription('HTTP API documentation for Creator Flow Studio server')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerJsonPath = `${swaggerPath}-json`;

  SwaggerModule.setup(swaggerPath, app, swaggerDocument, {
    jsonDocumentUrl: swaggerJsonPath,
  });

  return {
    uiPath: `/${swaggerPath}`,
    jsonPath: `/${swaggerJsonPath}`,
  };
};

async function bootstrap() {
  const logger = new AppLogger('HTTP', 'server');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false,
  });
  app.useLogger(logger);
  app.set('trust proxy', resolveTrustProxy());
  app.enableShutdownHooks();
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
  const swagger = setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);

  const baseUrl = normalizeBaseUrlForLogs(await app.getUrl());
  logger.log(`Swagger UI: ${baseUrl}${swagger.uiPath}`);
  logger.log(`Swagger JSON: ${baseUrl}${swagger.jsonPath}`);
}
void bootstrap();
