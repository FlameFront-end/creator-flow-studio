import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Idea } from './idea.entity';
import { GenerationStatus } from './generation-status.enum';

export enum AssetType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
}

@Entity({ name: 'assets' })
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ideaId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: AssetType;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  url!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  mime!: string | null;

  @Column({ type: 'integer', nullable: true })
  width!: number | null;

  @Column({ type: 'integer', nullable: true })
  height!: number | null;

  @Column({ type: 'integer', nullable: true })
  duration!: number | null;

  @Column({ type: 'text', nullable: true })
  sourcePrompt!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  provider!: string | null;

  @Column({ type: 'varchar', length: 16, default: GenerationStatus.QUEUED })
  status!: GenerationStatus;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Idea, { onDelete: 'CASCADE' })
  idea!: Idea;
}
