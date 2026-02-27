import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step15AiProviderModelProfiles1730024000000 implements MigrationInterface {
  name = 'Step15AiProviderModelProfiles1730024000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      ADD COLUMN IF NOT EXISTS "base_url" character varying(500)
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      ADD COLUMN IF NOT EXISTS "response_language" character varying(64)
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      ADD COLUMN IF NOT EXISTS "max_tokens" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      ADD COLUMN IF NOT EXISTS "is_enabled" boolean NOT NULL DEFAULT true
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      ADD COLUMN IF NOT EXISTS "api_key_encrypted" text
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      ADD COLUMN IF NOT EXISTS "updated_by" character varying(120)
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      UPDATE "ai_provider_models" m
      SET
        "base_url" = s."base_url",
        "response_language" = COALESCE(s."response_language", 'Русский'),
        "max_tokens" = COALESCE(s."max_tokens", 1400),
        "is_enabled" = COALESCE(s."is_enabled", true),
        "api_key_encrypted" = s."api_key_encrypted",
        "updated_by" = s."updated_by",
        "is_active" = true,
        "updated_at" = now()
      FROM "ai_provider_settings" s
      WHERE s."scope_key" = 'global'
        AND m."scope_key" = s."scope_key"
        AND m."provider" = s."provider"
        AND m."model" = s."model"
    `);

    await queryRunner.query(`
      UPDATE "ai_provider_models"
      SET "response_language" = COALESCE("response_language", 'Русский'),
          "max_tokens" = COALESCE("max_tokens", 1400),
          "is_enabled" = COALESCE("is_enabled", true)
      WHERE "scope_key" = 'global'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ai_provider_models_scope_active_true"
      ON "ai_provider_models" ("scope_key")
      WHERE "is_active" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_ai_provider_models_scope_active_true"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      DROP COLUMN IF EXISTS "is_active"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      DROP COLUMN IF EXISTS "updated_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      DROP COLUMN IF EXISTS "api_key_encrypted"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      DROP COLUMN IF EXISTS "is_enabled"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      DROP COLUMN IF EXISTS "max_tokens"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      DROP COLUMN IF EXISTS "response_language"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_provider_models"
      DROP COLUMN IF EXISTS "base_url"
    `);
  }
}
