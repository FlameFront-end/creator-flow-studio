import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'ai_provider_settings' })
@Unique('UQ_ai_provider_settings_scope_key', ['scopeKey'])
export class AiProviderSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'scope_key', type: 'varchar', length: 32, default: 'global' })
  scopeKey!: string;

  @Column({ type: 'varchar', length: 32, default: 'openai' })
  provider!: string;

  @Column({ name: 'api_key_encrypted', type: 'text', nullable: true })
  apiKeyEncrypted!: string | null;

  @Column({ type: 'varchar', length: 255 })
  model!: string;

  @Column({ name: 'base_url', type: 'varchar', length: 500, nullable: true })
  baseUrl!: string | null;

  @Column({
    name: 'response_language',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  responseLanguage!: string | null;

  @Column({ name: 'max_tokens', type: 'integer', nullable: true })
  maxTokens!: number | null;

  @Column({ name: 'ai_test_mode', type: 'boolean', nullable: true })
  aiTestMode!: boolean | null;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ name: 'updated_by', type: 'varchar', length: 120, nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
