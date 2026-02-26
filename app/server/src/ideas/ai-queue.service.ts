import { Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Job } from 'bullmq';
import { JobsOptions, Queue } from 'bullmq';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import { AI_GENERATION_QUEUE, AiJobName } from './ideas.constants';
import { buildRedisConnection } from './redis.config';

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

@Injectable()
export class AiQueueService implements OnModuleDestroy {
  private readonly queue = new Queue(AI_GENERATION_QUEUE, {
    connection: buildRedisConnection(),
  });

  private readonly defaultOptions: JobsOptions = {
    attempts: 1,
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
      `script:${data.scriptId}`,
    );
  }

  enqueueCaptionJob(data: GenerateCaptionJobData) {
    return this.addIdempotent(
      AiJobName.GENERATE_CAPTION,
      data,
      `caption:${data.captionId}`,
    );
  }

  enqueueImageJob(data: GenerateImageJobData) {
    return this.addIdempotent(
      AiJobName.GENERATE_IMAGE,
      data,
      `image:${data.assetId}`,
    );
  }

  enqueueVideoJob(data: GenerateVideoJobData) {
    return this.addIdempotent(
      AiJobName.GENERATE_VIDEO,
      data,
      `video:${data.assetId}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
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
}
