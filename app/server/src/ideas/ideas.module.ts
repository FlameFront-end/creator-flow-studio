import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiSettingsModule } from '../ai-settings/ai-settings.module';
import { Persona } from '../personas/entities/persona.entity';
import { Project } from '../projects/entities/project.entity';
import { PromptModule } from '../prompt/prompt.module';
import { LocalObjectStorageService } from '../storage/local-object-storage.service';
import { AiQueueService } from './ai-queue.service';
import { AiRunLog } from './entities/ai-run-log.entity';
import { Asset } from './entities/asset.entity';
import { Caption } from './entities/caption.entity';
import { Idea } from './entities/idea.entity';
import { Script } from './entities/script.entity';
import { IdeasController } from './ideas.controller';
import {
  IMAGE_PROVIDER_TOKEN,
  ImageProvider,
} from './providers/image-provider.interface';
import { MockImageProvider } from './providers/mock-image.provider';
import {
  VIDEO_PROVIDER_TOKEN,
  VideoProvider,
} from './providers/video-provider.interface';
import { MockVideoProvider } from './providers/mock-video.provider';
import { LLM_PROVIDER_TOKEN } from './llm/llm-provider.interface';
import { OpenAiCompatibleProvider } from './llm/openai-compatible.provider';
import { OpenAiProvider } from './llm/openai.provider';
import { OpenRouterProvider } from './llm/openrouter.provider';
import { RoutingLlmProvider } from './llm/routing-llm.provider';
import { IdeasService } from './ideas.service';
import { IdeasWorkerRunner } from './ideas.worker-runner';

@Module({
  imports: [
    AiSettingsModule,
    PromptModule,
    TypeOrmModule.forFeature([
      Project,
      Persona,
      Idea,
      Script,
      Caption,
      AiRunLog,
      Asset,
    ]),
  ],
  controllers: [IdeasController],
  providers: [
    AiQueueService,
    IdeasService,
    IdeasWorkerRunner,
    OpenAiProvider,
    OpenRouterProvider,
    OpenAiCompatibleProvider,
    RoutingLlmProvider,
    MockImageProvider,
    MockVideoProvider,
    LocalObjectStorageService,
    {
      provide: LLM_PROVIDER_TOKEN,
      useExisting: RoutingLlmProvider,
    },
    {
      provide: IMAGE_PROVIDER_TOKEN,
      inject: [MockImageProvider],
      useFactory: (mockImageProvider: MockImageProvider): ImageProvider =>
        mockImageProvider,
    },
    {
      provide: VIDEO_PROVIDER_TOKEN,
      inject: [MockVideoProvider],
      useFactory: (mockVideoProvider: MockVideoProvider): VideoProvider =>
        mockVideoProvider,
    },
  ],
  exports: [IdeasWorkerRunner],
})
export class IdeasModule {}
