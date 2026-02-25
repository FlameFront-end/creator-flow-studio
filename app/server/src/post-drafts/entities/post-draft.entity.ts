import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Caption } from '../../ideas/entities/caption.entity';
import { Idea } from '../../ideas/entities/idea.entity';
import { ModerationCheck } from './moderation-check.entity';

export enum PostDraftStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity({ name: 'post_drafts' })
export class PostDraft {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ideaId!: string;

  @Column({ type: 'uuid', nullable: true })
  captionId!: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  selectedAssets!: string[];

  @Column({ type: 'varchar', length: 16, default: PostDraftStatus.DRAFT })
  status!: PostDraftStatus;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Idea, { onDelete: 'CASCADE' })
  idea!: Idea;

  @ManyToOne(() => Caption, { onDelete: 'SET NULL', nullable: true })
  caption!: Caption | null;

  @OneToMany(
    () => ModerationCheck,
    (moderationCheck) => moderationCheck.postDraft,
  )
  moderationChecks!: ModerationCheck[];
}

