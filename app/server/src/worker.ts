import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IdeasWorkerRunner } from './ideas/ideas.worker-runner';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });
  const logger = new Logger('WorkerBootstrap');

  const runner = app.get(IdeasWorkerRunner);
  runner.start();
  logger.log('AI worker is running');

  const shutdown = async () => {
    logger.log('Stopping AI worker');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('WorkerBootstrap');
  logger.error(
    error instanceof Error ? error.message : 'Unknown bootstrap error',
  );
  process.exit(1);
});

