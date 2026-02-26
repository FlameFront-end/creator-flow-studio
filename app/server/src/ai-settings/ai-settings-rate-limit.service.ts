import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type BucketState = {
  startedAt: number;
  count: number;
};

@Injectable()
export class AiSettingsRateLimitService {
  private readonly windowMs = 60_000;
  private readonly maxRequests = 6;
  private readonly buckets = new Map<string, BucketState>();

  assertCanTestConnection(clientKey: string): void {
    this.gc();
    const key = clientKey || 'unknown';
    const now = Date.now();
    const state = this.buckets.get(key);

    if (!state || now - state.startedAt > this.windowMs) {
      this.buckets.set(key, { startedAt: now, count: 1 });
      return;
    }

    if (state.count >= this.maxRequests) {
      throw new HttpException(
        'Too many AI connection test requests. Try again in one minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    state.count += 1;
    this.buckets.set(key, state);
  }

  private gc(): void {
    const now = Date.now();
    for (const [key, value] of this.buckets) {
      if (now - value.startedAt > this.windowMs * 2) {
        this.buckets.delete(key);
      }
    }
  }
}
