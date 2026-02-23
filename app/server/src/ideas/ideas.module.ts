import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Persona } from '../personas/entities/persona.entity';
import { Project } from '../projects/entities/project.entity';
import { PromptModule } from '../prompt/prompt.module';
import { AiQueueService } from './ai-queue.service';
import { AiRunLog } from './entities/ai-run-log.entity';
import { Caption } from './entities/caption.entity';
import { Idea } from './entities/idea.entity';
import { Script } from './entities/script.entity';
import { IdeasController } from './ideas.controller';
import {
  LLM_PROVIDER_TOKEN,
  LlmProvider,
} from './llm/llm-provider.interface';
import { OpenAiProvider } from './llm/openai.provider';
import { IdeasService } from './ideas.service';
import { IdeasWorkerRunner } from './ideas.worker-runner';

@Module({
  imports: [
    PromptModule,
    TypeOrmModule.forFeature([
      Project,
      Persona,
      Idea,
      Script,
      Caption,
      AiRunLog,
    ]),
  ],
  controllers: [IdeasController],
  providers: [
    AiQueueService,
    IdeasService,
    IdeasWorkerRunner,
    OpenAiProvider,
    {
      provide: LLM_PROVIDER_TOKEN,
      inject: [OpenAiProvider],
      useFactory: (openAiProvider: OpenAiProvider): LlmProvider =>
        openAiProvider,
    },
  ],
  exports: [IdeasWorkerRunner],
})
export class IdeasModule {}

