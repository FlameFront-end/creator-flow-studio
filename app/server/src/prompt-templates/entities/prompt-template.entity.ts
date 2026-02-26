import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Persona } from '../../personas/entities/persona.entity';

export enum PromptTemplateKey {
  IDEAS = 'ideas',
  SCRIPT = 'script',
  CAPTION = 'caption',
  IMAGE_PROMPT = 'image_prompt',
  VIDEO_PROMPT = 'video_prompt',
}

@Entity({ name: 'prompt_templates' })
export class PromptTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  personaId!: string | null;

  @Column({ type: 'varchar', length: 32 })
  key!: PromptTemplateKey;

  @Column({ type: 'text' })
  template!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Persona, { onDelete: 'CASCADE' })
  persona!: Persona;
}
