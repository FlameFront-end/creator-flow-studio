import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step14AiProviderModelLibrary1730023000000
  implements MigrationInterface
{
  name = 'Step14AiProviderModelLibrary1730023000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_provider_models" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "scope_key" character varying(32) NOT NULL DEFAULT 'global',
        "provider" character varying(32) NOT NULL,
        "model" character varying(255) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_provider_models_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_ai_provider_models_scope_provider_model"
      ON "ai_provider_models" ("scope_key", "provider", "model")
    `);

    await queryRunner.query(`
      INSERT INTO "ai_provider_models" ("scope_key", "provider", "model", "created_at", "updated_at")
      SELECT "scope_key", "provider", "model", now(), now()
      FROM "ai_provider_settings"
      WHERE COALESCE(TRIM("model"), '') <> ''
      ON CONFLICT ("scope_key", "provider", "model") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_ai_provider_models_scope_provider_model"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "ai_provider_models"
    `);
  }
}
