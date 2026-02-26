import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step13PromptStudioContextScoping1730022000000 implements MigrationInterface {
  name = 'Step13PromptStudioContextScoping1730022000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "personas"
      ADD COLUMN IF NOT EXISTS "projectId" uuid
    `);

    await queryRunner.query(`
      UPDATE "personas" p
      SET "projectId" = src."projectId"
      FROM (
        SELECT DISTINCT ON (i."personaId")
          i."personaId",
          i."projectId"
        FROM "ideas" i
        ORDER BY i."personaId", i."createdAt" DESC
      ) src
      WHERE p."id" = src."personaId"
        AND p."projectId" IS NULL
    `);

    await queryRunner.query(`
      WITH first_project AS (
        SELECT "id"
        FROM "projects"
        ORDER BY "createdAt" ASC
        LIMIT 1
      )
      UPDATE "personas" p
      SET "projectId" = (SELECT "id" FROM first_project)
      WHERE p."projectId" IS NULL
        AND EXISTS (SELECT 1 FROM first_project)
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_personas_projectId_projects_id'
        ) THEN
          ALTER TABLE "personas"
          ADD CONSTRAINT "FK_personas_projectId_projects_id"
          FOREIGN KEY ("projectId") REFERENCES "projects"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_personas_name_ci"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_personas_project_name_ci"
      ON "personas" (
        COALESCE("projectId", '00000000-0000-0000-0000-000000000000'::uuid),
        LOWER("name")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "policy_rules"
      ADD COLUMN IF NOT EXISTS "personaId" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_policy_rules_personaId"
      ON "policy_rules" ("personaId")
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_policy_rules_personaId_personas_id'
        ) THEN
          ALTER TABLE "policy_rules"
          ADD CONSTRAINT "FK_policy_rules_personaId_personas_id"
          FOREIGN KEY ("personaId") REFERENCES "personas"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "prompt_templates"
      ADD COLUMN IF NOT EXISTS "personaId" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_prompt_templates_personaId"
      ON "prompt_templates" ("personaId")
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_prompt_templates_personaId_personas_id'
        ) THEN
          ALTER TABLE "prompt_templates"
          ADD CONSTRAINT "FK_prompt_templates_personaId_personas_id"
          FOREIGN KEY ("personaId") REFERENCES "personas"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "prompt_templates"
      DROP CONSTRAINT IF EXISTS "UQ_prompt_templates_key"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_prompt_templates_persona_key"
      ON "prompt_templates" (
        COALESCE("personaId", '00000000-0000-0000-0000-000000000000'::uuid),
        "key"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_prompt_templates_persona_key"`,
    );
    await queryRunner.query(`
      ALTER TABLE "prompt_templates"
      ADD CONSTRAINT "UQ_prompt_templates_key" UNIQUE ("key")
    `);
    await queryRunner.query(`
      ALTER TABLE "prompt_templates"
      DROP CONSTRAINT IF EXISTS "FK_prompt_templates_personaId_personas_id"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_prompt_templates_personaId"`,
    );
    await queryRunner.query(`
      ALTER TABLE "prompt_templates"
      DROP COLUMN IF EXISTS "personaId"
    `);

    await queryRunner.query(`
      ALTER TABLE "policy_rules"
      DROP CONSTRAINT IF EXISTS "FK_policy_rules_personaId_personas_id"
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_policy_rules_personaId"`,
    );
    await queryRunner.query(`
      ALTER TABLE "policy_rules"
      DROP COLUMN IF EXISTS "personaId"
    `);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_personas_project_name_ci"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_personas_name_ci"
      ON "personas" (LOWER("name"))
    `);
    await queryRunner.query(`
      ALTER TABLE "personas"
      DROP CONSTRAINT IF EXISTS "FK_personas_projectId_projects_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "personas"
      DROP COLUMN IF EXISTS "projectId"
    `);
  }
}
