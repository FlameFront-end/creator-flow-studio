import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Job } from 'bullmq';
import { JobsOptions, Queue } from 'bullmq';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import {
  AI_GENERATION_DLQ,
  AI_GENERATION_QUEUE,
  AiJobName,
} from './ideas.constants';
import { buildRedisConnection } from './redis.config';

const toPositiveInteger = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

export type GenerateIdeasJobData = GenerateIdeasDto & {
  count: number;
  format: string;
};

export type GenerateScriptJobData = {
  ideaId: string;
  scriptId: string;
};

export type GenerateCaptionJobData = {
  ideaId: string;
  captionId: string;
};

export type GenerateImageJobData = {
  ideaId: string;
  assetId: string;
};

export type GenerateVideoJobData = {
  ideaId: string;
  assetId: string;
};

export type AiDlqJobData = {
  originalQueue: string;
  originalJobId: string | null;
  originalName: string;
  attemptsMade: number;
  maxAttempts: number;
  failedAt: string;
  errorMessage: string;
  errorStack: string | null;
  data: unknown;
};

@Injectable()
export class AiQueueService implements OnModuleDestroy {
  private readonly queue = new Queue(AI_GENERATION_QUEUE, {
    connection: buildRedisConnection(),
  });
  private readonly dlqQueue = new Queue(AI_GENERATION_DLQ, {
    connection: buildRedisConnection(),
  });
  private readonly queueAttempts = toPositiveInteger(
    process.env.QUEUE_ATTEMPTS,
    3,
  );
  private readonly queueBackoffMs = toPositiveInteger(
    process.env.QUEUE_BACKOFF_MS,
    1500,
  );

  private readonly defaultOptions: JobsOptions = {
    attempts: this.queueAttempts,
    backoff: {
      type: 'fixed',
      delay: this.queueBackoffMs,
    },
    removeOnComplete: 200,
    removeOnFail: 500,
  };

  enqueueIdeasJob(data: GenerateIdeasJobData) {
    return this.queue.add(AiJobName.GENERATE_IDEAS, data, this.defaultOptions);
  }

  enqueueScriptJob(data: GenerateScriptJobData) {
    return this.addIdempotent(
      AiJobName.GENERATE_SCRIPT,
      data,
      this.buildJobId('script', data.scriptId),
    );
  }

  enqueueCaptionJob(data: GenerateCaptionJobData) {
    return this.addIdempotent(
      AiJobName.GENERATE_CAPTION,
      data,
      this.buildJobId('caption', data.captionId),
    );
  }

  enqueueImageJob(data: GenerateImageJobData) {
    return this.addIdempotent(
      AiJobName.GENERATE_IMAGE,
      data,
      this.buildJobId('image', data.assetId),
    );
  }

  enqueueVideoJob(data: GenerateVideoJobData) {
    return this.addIdempotent(
      AiJobName.GENERATE_VIDEO,
      data,
      this.buildJobId('video', data.assetId),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([this.queue.close(), this.dlqQueue.close()]);
  }

  enqueueDlqJob(data: AiDlqJobData) {
    return this.dlqQueue.add('failed-job', data, {
      removeOnComplete: 1000,
      removeOnFail: 1000,
    });
  }

  private async addIdempotent<T>(
    name: AiJobName,
    data: T,
    jobId: string,
  ): Promise<Job<T>> {
    try {
      return await this.queue.add(name, data, {
        ...this.defaultOptions,
        jobId,
      });
    } catch (error) {
      if (this.isDuplicateJobError(error)) {
        const existingJob = await this.queue.getJob(jobId);
        if (existingJob) {
          return existingJob as Job<T>;
        }
      }
      throw error;
    }
  }

  private isDuplicateJobError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return (
      message.includes('job') &&
      (message.includes('exists') || message.includes('duplicate'))
    );
  }

  private buildJobId(prefix: string, id: string): string {
    return `${prefix}-${id}`;
  }
}
