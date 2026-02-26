import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

@Injectable()
export class HealthRedisService implements OnModuleDestroy {
  private readonly logger = new Logger(HealthRedisService.name);
  private readonly redis: IORedis;

  constructor() {
    this.redis = new IORedis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: toPositiveInt(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
    this.redis.on('error', (error) => {
      this.logger.warn(`Health Redis error: ${error.message}`);
    });
  }

  async ping(): Promise<void> {
    await this.redis.ping();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
