import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';

export type AuthSessionRecord = {
  userId: string;
  refreshTokenHash: string;
  refreshExpiresAt: number;
};

const toPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

@Injectable()
export class AuthSessionStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthSessionStoreService.name);
  private readonly redis: IORedis;
  private readonly keyPrefix =
    process.env.AUTH_SESSION_KEY_PREFIX?.trim() || 'auth:session';

  constructor() {
    this.redis = new IORedis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: toPositiveInt(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
    this.redis.on('error', (error) => {
      this.logger.warn(`Auth session store Redis error: ${error.message}`);
    });
  }

  async setSession(
    sessionId: string,
    session: AuthSessionRecord,
    ttlSeconds: number,
  ): Promise<void> {
    await this.redis.set(
      this.toKey(sessionId),
      JSON.stringify(session),
      'EX',
      ttlSeconds,
    );
  }

  async getSession(sessionId: string): Promise<AuthSessionRecord | null> {
    const raw = await this.redis.get(this.toKey(sessionId));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<AuthSessionRecord>;
      if (
        typeof parsed.userId !== 'string' ||
        typeof parsed.refreshTokenHash !== 'string' ||
        typeof parsed.refreshExpiresAt !== 'number'
      ) {
        return null;
      }
      return {
        userId: parsed.userId,
        refreshTokenHash: parsed.refreshTokenHash,
        refreshExpiresAt: parsed.refreshExpiresAt,
      };
    } catch {
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(this.toKey(sessionId));
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private toKey(sessionId: string): string {
    return `${this.keyPrefix}:${sessionId}`;
  }
}
