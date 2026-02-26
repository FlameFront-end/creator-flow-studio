import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import IORedis from 'ioredis';
import { DataSource } from 'typeorm';

type DependencyName = 'database' | 'redis';
type DependencyStatus = 'up' | 'down';

type DependencyCheck = {
  name: DependencyName;
  status: DependencyStatus;
  latencyMs: number;
  error: string | null;
};

export type ReadinessPayload = {
  status: 'ready' | 'not_ready';
  timestamp: string;
  dependencies: DependencyCheck[];
};

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async checkReadiness(): Promise<ReadinessPayload> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const dependencies = [database, redis];
    const isReady = dependencies.every((item) => item.status === 'up');

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      dependencies,
    };
  }

  private async checkDatabase(): Promise<DependencyCheck> {
    const startedAt = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return {
        name: 'database',
        status: 'up',
        latencyMs: Date.now() - startedAt,
        error: null,
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'down',
        latencyMs: Date.now() - startedAt,
        error: this.toErrorMessage(error),
      };
    }
  }

  private async checkRedis(): Promise<DependencyCheck> {
    const startedAt = Date.now();
    const redis = new IORedis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: toNumber(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });

    try {
      await redis.ping();
      return {
        name: 'redis',
        status: 'up',
        latencyMs: Date.now() - startedAt,
        error: null,
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'down',
        latencyMs: Date.now() - startedAt,
        error: this.toErrorMessage(error),
      };
    } finally {
      try {
        await redis.quit();
      } catch {
        redis.disconnect();
      }
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return 'Unknown dependency check error';
  }
}
