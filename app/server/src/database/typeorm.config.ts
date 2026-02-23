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
import { Step4AssetsImageVideo1730013000000 } from './migrations/1730013000000-step4-assets-image-video';

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
  ],
  migrations: [
    InitSchema1730010000000,
    Step2PersonaPolicyTemplate1730011000000,
    Step3IdeasAndScripts1730012000000,
    Step4AssetsImageVideo1730013000000,
  ],
  synchronize: false,
  migrationsRun: true,
});

export const appDataSource = new DataSource(buildTypeOrmOptions());
