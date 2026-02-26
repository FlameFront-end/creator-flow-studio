import { DataSource, DataSourceOptions } from 'typeorm';
import { PolicyRule } from '../policy-rules/entities/policy-rule.entity';
import { PromptTemplate } from '../prompt-templates/entities/prompt-template.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Project } from '../projects/entities/project.entity';
import { InitSchema1730010000000 } from './migrations/1730010000000-init-schema';
import { Step2PersonaPolicyTemplate1730011000000 } from './migrations/1730011000000-step2-persona-policy-template';
import { Step3IdeasAndScripts1730012000000 } from './migrations/1730012000000-step3-ideas-and-scripts';
import { Idea } from '../ideas/entities/idea.entity';
import { Script } from '../ideas/entities/script.entity';
import { Caption } from '../ideas/entities/caption.entity';
import { AiRunLog } from '../ideas/entities/ai-run-log.entity';
import { Asset } from '../ideas/entities/asset.entity';
import { ModerationCheck } from '../post-drafts/entities/moderation-check.entity';
import { PostDraft } from '../post-drafts/entities/post-draft.entity';
import { Step4AssetsImageVideo1730013000000 } from './migrations/1730013000000-step4-assets-image-video';
import { Step5ApprovalAndExport1730014000000 } from './migrations/1730014000000-step5-approval-and-export';
import { Step6VideoPrompt1730015000000 } from './migrations/1730015000000-step6-video-prompt';
import { AiProviderSettings } from '../ai-settings/entities/ai-provider-settings.entity';
import { Step7AiProviderSettings1730016000000 } from './migrations/1730016000000-step7-ai-provider-settings';
import { Step8AiRunLogErrorDetails1730017000000 } from './migrations/1730017000000-step8-ai-run-log-error-details';
import { Step9AiResponseLanguage1730018000000 } from './migrations/1730018000000-step9-ai-response-language';

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const buildTypeOrmOptions = (): DataSourceOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: toNumber(process.env.DB_PORT, 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'ai_influencer',
  entities: [
    Project,
    Persona,
    PolicyRule,
    PromptTemplate,
    Idea,
    Script,
    Caption,
    AiRunLog,
    Asset,
    PostDraft,
    ModerationCheck,
    AiProviderSettings,
  ],
  migrations: [
    InitSchema1730010000000,
    Step2PersonaPolicyTemplate1730011000000,
    Step3IdeasAndScripts1730012000000,
    Step4AssetsImageVideo1730013000000,
    Step5ApprovalAndExport1730014000000,
    Step6VideoPrompt1730015000000,
    Step7AiProviderSettings1730016000000,
    Step8AiRunLogErrorDetails1730017000000,
    Step9AiResponseLanguage1730018000000,
  ],
  synchronize: false,
  migrationsRun: true,
});

export const appDataSource = new DataSource(buildTypeOrmOptions());
