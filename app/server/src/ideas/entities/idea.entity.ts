import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Persona } from '../../personas/entities/persona.entity';
import { Project } from '../../projects/entities/project.entity';
import { Caption } from './caption.entity';
import { GenerationStatus } from './generation-status.enum';
import { Script } from './script.entity';
import { Asset } from './asset.entity';

export enum IdeaFormat {
  REEL = 'reel',
  SHORT = 'short',
  TIKTOK = 'tiktok',
}

@Entity({ name: 'ideas' })
export class Idea {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({ type: 'uuid' })
  personaId!: string;

  @Column({ type: 'varchar', length: 280 })
  topic!: string;

  @Column({ type: 'text' })
  hook!: string;

  @Column({ type: 'varchar', length: 16 })
  format!: IdeaFormat;

  @Column({ type: 'varchar', length: 16, default: GenerationStatus.QUEUED })
  status!: GenerationStatus;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'text', nullable: true })
  imagePrompt!: string | null;

  @Column({ type: 'text', nullable: true })
  videoPrompt!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project!: Project;

  @ManyToOne(() => Persona, { onDelete: 'CASCADE' })
  persona!: Persona;

  @OneToMany(() => Script, (script) => script.idea)
  scripts!: Script[];

  @OneToMany(() => Caption, (caption) => caption.idea)
  captions!: Caption[];

  @OneToMany(() => Asset, (asset) => asset.idea)
  assets!: Asset[];
}
