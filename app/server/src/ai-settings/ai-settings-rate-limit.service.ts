import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import IORedis from 'ioredis';

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

@Injectable()
export class AiSettingsRateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(AiSettingsRateLimitService.name);
  private readonly windowMs = 60_000;
  private readonly maxRequests = 6;
  private readonly redis: IORedis;

  constructor() {
    this.redis = new IORedis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: toNumber(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
    this.redis.on('error', (error) => {
      this.logger.warn(`Rate-limit Redis error: ${error.message}`);
    });
  }

  async assertCanTestConnection(clientKey: string): Promise<void> {
    const key = this.toRedisKey(clientKey);
    const count = await this.incrementWithinWindow(key);
    if (count <= this.maxRequests) {
      return;
    }

    const ttlMs = await this.safeGetTtl(key);
    const retryAfterSeconds =
      ttlMs > 0 ? Math.ceil(ttlMs / 1000) : Math.ceil(this.windowMs / 1000);
    throw new HttpException(
      `Too many AI connection test requests. Try again in ${retryAfterSeconds} seconds.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private async incrementWithinWindow(key: string): Promise<number> {
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.pexpire(key, this.windowMs);
      }
      return count;
    } catch (error) {
      this.logger.error(
        `Failed to check distributed rate-limit bucket: ${this.toErrorMessage(error)}`,
      );
      throw new ServiceUnavailableException(
        'AI connection test rate limiter is temporarily unavailable.',
      );
    }
  }

  private async safeGetTtl(key: string): Promise<number> {
    try {
      return await this.redis.pttl(key);
    } catch {
      return -1;
    }
  }

  private toRedisKey(clientKey: string): string {
    const normalized = clientKey.trim() || 'unknown';
    const hash = createHash('sha256').update(normalized).digest('hex');
    return `rate:ai-settings:test:${hash}`;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'unknown redis error';
  }
}
