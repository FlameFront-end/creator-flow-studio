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

type AuthRateLimitOperation = 'register' | 'login' | 'refresh' | 'logout';

type RateLimitRule = {
  maxRequests: number;
  windowMs: number;
};

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

@Injectable()
export class AuthRateLimitService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthRateLimitService.name);
  private readonly redis: IORedis;

  private readonly rules: Record<AuthRateLimitOperation, RateLimitRule> = {
    register: {
      maxRequests: toPositiveInt(
        process.env.AUTH_RATE_LIMIT_REGISTER_PER_MINUTE,
        5,
      ),
      windowMs: 60_000,
    },
    login: {
      maxRequests: toPositiveInt(
        process.env.AUTH_RATE_LIMIT_LOGIN_PER_MINUTE,
        8,
      ),
      windowMs: 60_000,
    },
    refresh: {
      maxRequests: toPositiveInt(
        process.env.AUTH_RATE_LIMIT_REFRESH_PER_MINUTE,
        30,
      ),
      windowMs: 60_000,
    },
    logout: {
      maxRequests: toPositiveInt(
        process.env.AUTH_RATE_LIMIT_LOGOUT_PER_MINUTE,
        60,
      ),
      windowMs: 60_000,
    },
  };

  constructor() {
    this.redis = new IORedis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: toPositiveInt(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
    this.redis.on('error', (error) => {
      this.logger.warn(`Auth rate-limit Redis error: ${error.message}`);
    });
  }

  async assertCanProceed(
    operation: AuthRateLimitOperation,
    clientKey: string,
  ): Promise<void> {
    const rule = this.rules[operation];
    const key = this.toRedisKey(operation, clientKey);
    const count = await this.incrementWithinWindow(key, rule.windowMs);
    if (count <= rule.maxRequests) {
      return;
    }

    const ttlMs = await this.safeGetTtl(key);
    const retryAfterSeconds =
      ttlMs > 0 ? Math.ceil(ttlMs / 1000) : Math.ceil(rule.windowMs / 1000);

    throw new HttpException(
      `Too many auth ${operation} requests. Try again in ${retryAfterSeconds} seconds.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private async incrementWithinWindow(
    key: string,
    windowMs: number,
  ): Promise<number> {
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.pexpire(key, windowMs);
      }
      return count;
    } catch (error) {
      this.logger.error(
        `Failed to check auth rate-limit bucket: ${this.toErrorMessage(error)}`,
      );
      throw new ServiceUnavailableException(
        'Auth rate limiter is temporarily unavailable.',
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

  private toRedisKey(
    operation: AuthRateLimitOperation,
    clientKey: string,
  ): string {
    const normalized = clientKey.trim() || 'unknown';
    const hash = createHash('sha256').update(normalized).digest('hex');
    return `rate:auth:${operation}:${hash}`;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'unknown redis error';
  }
}
