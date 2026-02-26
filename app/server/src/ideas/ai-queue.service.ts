import { Injectable, OnModuleDestroy } from '@nestjs/common';
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
    return this.queue.add(AiJobName.GENERATE_SCRIPT, data, this.defaultOptions);
  }

  enqueueCaptionJob(data: GenerateCaptionJobData) {
    return this.queue.add(AiJobName.GENERATE_CAPTION, data, this.defaultOptions);
  }

  enqueueImageJob(data: GenerateImageJobData) {
    return this.queue.add(AiJobName.GENERATE_IMAGE, data, this.defaultOptions);
  }

  enqueueVideoJob(data: GenerateVideoJobData) {
    return this.queue.add(AiJobName.GENERATE_VIDEO, data, this.defaultOptions);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
