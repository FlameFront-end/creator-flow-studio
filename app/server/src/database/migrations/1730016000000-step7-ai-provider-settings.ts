import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step7AiProviderSettings1730016000000 implements MigrationInterface {
  name = 'Step7AiProviderSettings1730016000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_provider_settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "scope_key" character varying(32) NOT NULL DEFAULT 'global',
        "provider" character varying(32) NOT NULL DEFAULT 'openai',
        "api_key_encrypted" text,
        "model" character varying(255) NOT NULL DEFAULT 'gpt-4o-mini',
        "base_url" character varying(500),
        "max_tokens" integer,
        "ai_test_mode" boolean,
        "is_enabled" boolean NOT NULL DEFAULT true,
        "updated_by" character varying(120),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_provider_settings_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_ai_provider_settings_scope_key"
      ON "ai_provider_settings" ("scope_key")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "public"."IDX_ai_provider_settings_scope_key"
    `);

    await queryRunner.query(`
      DROP TABLE "ai_provider_settings"
    `);
  }
}
