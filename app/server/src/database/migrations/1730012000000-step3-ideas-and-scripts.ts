import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step3IdeasAndScripts1730012000000 implements MigrationInterface {
  name = 'Step3IdeasAndScripts1730012000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ideas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "projectId" uuid NOT NULL,
        "personaId" uuid NOT NULL,
        "topic" character varying(280) NOT NULL,
        "hook" text NOT NULL,
        "format" character varying(16) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'queued',
        "error" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ideas_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ideas_projectId" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_ideas_personaId" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scripts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ideaId" uuid NOT NULL,
        "text" text,
        "shotList" jsonb,
        "status" character varying(16) NOT NULL DEFAULT 'queued',
        "error" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scripts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_scripts_ideaId" FOREIGN KEY ("ideaId") REFERENCES "ideas"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "captions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ideaId" uuid NOT NULL,
        "text" text,
        "hashtags" jsonb,
        "status" character varying(16) NOT NULL DEFAULT 'queued',
        "error" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_captions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_captions_ideaId" FOREIGN KEY ("ideaId") REFERENCES "ideas"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_run_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider" character varying(32) NOT NULL,
        "model" character varying(64) NOT NULL,
        "operation" character varying(32) NOT NULL,
        "projectId" uuid,
        "ideaId" uuid,
        "latencyMs" integer,
        "tokens" integer,
        "requestId" character varying(128),
        "status" character varying(16) NOT NULL,
        "error" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_run_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ideas_projectId_createdAt" ON "ideas" ("projectId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_scripts_ideaId_createdAt" ON "scripts" ("ideaId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_captions_ideaId_createdAt" ON "captions" ("ideaId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_run_logs_projectId_createdAt" ON "ai_run_logs" ("projectId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_run_logs_ideaId_createdAt" ON "ai_run_logs" ("ideaId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_run_logs_ideaId_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_run_logs_projectId_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_captions_ideaId_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_scripts_ideaId_createdAt"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ideas_projectId_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_run_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "captions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "scripts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ideas"`);
  }
}

