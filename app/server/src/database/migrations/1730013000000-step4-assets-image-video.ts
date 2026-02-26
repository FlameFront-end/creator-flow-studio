import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step4AssetsImageVideo1730013000000 implements MigrationInterface {
  name = 'Step4AssetsImageVideo1730013000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ideas"
      ADD COLUMN IF NOT EXISTS "imagePrompt" text
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ideaId" uuid NOT NULL,
        "type" character varying(16) NOT NULL,
        "url" character varying(2048),
        "mime" character varying(128),
        "width" integer,
        "height" integer,
        "duration" integer,
        "sourcePrompt" text,
        "provider" character varying(64),
        "status" character varying(16) NOT NULL DEFAULT 'queued',
        "error" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_assets_ideaId" FOREIGN KEY ("ideaId") REFERENCES "ideas"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_assets_ideaId_createdAt" ON "assets" ("ideaId", "createdAt")`,
    );

    await queryRunner.query(`
      INSERT INTO "prompt_templates" ("key", "template")
      VALUES (
        'image_prompt',
        'Create one high-quality vertical visual concept for this idea. Keep it realistic, cinematic and social-first. Include scene, composition, lighting, camera angle, mood, color palette and key objects. Output only a concise generation prompt based on topic={{topic}}, hook={{hook}}, format={{format}}.'
      )
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_assets_ideaId_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "assets"`);
    await queryRunner.query(
      `ALTER TABLE "ideas" DROP COLUMN IF EXISTS "imagePrompt"`,
    );
  }
}
