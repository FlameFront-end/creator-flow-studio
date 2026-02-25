import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PostDraft } from './post-draft.entity';

export enum ModerationCheckStatus {
  PASSED = 'passed',
  FAILED = 'failed',
}

export type ModerationCheckItem = {
  passed: boolean;
  score: number;
  hits: string[];
};

export type ModerationChecksPayload = {
  nsfw: ModerationCheckItem;
  toxicity: ModerationCheckItem;
  forbiddenTopics: ModerationCheckItem;
  policy: ModerationCheckItem;
};

@Entity({ name: 'moderation_checks' })
export class ModerationCheck {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  postDraftId!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  checks!: ModerationChecksPayload;

  @Column({ type: 'varchar', length: 16 })
  status!: ModerationCheckStatus;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => PostDraft, (postDraft) => postDraft.moderationChecks, {
    onDelete: 'CASCADE',
  })
  postDraft!: PostDraft;
}

