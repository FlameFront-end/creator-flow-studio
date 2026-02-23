import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GenerationStatus } from './generation-status.enum';
import { Idea } from './idea.entity';

@Entity({ name: 'captions' })
export class Caption {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ideaId!: string;

  @Column({ type: 'text', nullable: true })
  text!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  hashtags!: string[] | null;

  @Column({ type: 'varchar', length: 16, default: GenerationStatus.QUEUED })
  status!: GenerationStatus;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Idea, (idea) => idea.captions, { onDelete: 'CASCADE' })
  idea!: Idea;
}

