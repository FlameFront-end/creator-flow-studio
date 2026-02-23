import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum PromptTemplateKey {
  IDEAS = 'ideas',
  SCRIPT = 'script',
  CAPTION = 'caption',
  IMAGE_PROMPT = 'image_prompt',
}

@Entity({ name: 'prompt_templates' })
export class PromptTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  key!: PromptTemplateKey;

  @Column({ type: 'text' })
  template!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
