import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { GenerationStatus } from './generation-status.enum';

export enum AiOperation {
  IDEAS = 'ideas',
  SCRIPT = 'script',
  CAPTION = 'caption',
  IMAGE_PROMPT = 'image_prompt',
  VIDEO_PROMPT = 'video_prompt',
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity({ name: 'ai_run_logs' })
export class AiRunLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  provider!: string;

  @Column({ type: 'varchar', length: 64 })
  model!: string;

  @Column({ type: 'varchar', length: 32 })
  operation!: AiOperation;

  @Column({ type: 'uuid', nullable: true })
  projectId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  ideaId!: string | null;

  @Column({ type: 'integer', nullable: true })
  latencyMs!: number | null;

  @Column({ type: 'integer', nullable: true })
  tokens!: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  requestId!: string | null;

  @Column({ type: 'varchar', length: 16 })
  status!: GenerationStatus;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
