import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLogger } from './common/logging/app-logger';
import { IdeasWorkerRunner } from './ideas/ideas.worker-runner';

async function bootstrap() {
  const logger = new AppLogger('WorkerBootstrap', 'worker');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger,
  });

  const runner = app.get(IdeasWorkerRunner);
  runner.start();
  logger.log('AI worker is running');

  const shutdown = async () => {
    logger.log('Stopping AI worker');
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown();
  });
  process.on('SIGTERM', () => {
    void shutdown();
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(
      reason instanceof Error ? reason.message : 'Unhandled rejection',
      reason instanceof Error ? reason.stack : undefined,
    );
  });
  process.on('uncaughtException', (error) => {
    logger.error(error.message, error.stack);
  });
}

bootstrap().catch((error: unknown) => {
  const logger = new AppLogger('WorkerBootstrap', 'worker');
  logger.error(
    error instanceof Error ? error.message : 'Unknown bootstrap error',
  );
  process.exit(1);
});
