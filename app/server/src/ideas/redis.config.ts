import type { ConnectionOptions } from 'bullmq';

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildRedisConnection = (): ConnectionOptions => ({
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: toNumber(process.env.REDIS_PORT, 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});
