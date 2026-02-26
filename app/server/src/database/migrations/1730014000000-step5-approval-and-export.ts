import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step5ApprovalAndExport1730014000000 implements MigrationInterface {
  name = 'Step5ApprovalAndExport1730014000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "post_drafts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ideaId" uuid NOT NULL,
        "captionId" uuid,
        "selectedAssets" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" character varying(16) NOT NULL DEFAULT 'draft',
        "scheduledAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_drafts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_post_drafts_ideaId" FOREIGN KEY ("ideaId") REFERENCES "ideas"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_post_drafts_captionId" FOREIGN KEY ("captionId") REFERENCES "captions"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "moderation_checks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "postDraftId" uuid NOT NULL,
        "checks" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" character varying(16) NOT NULL,
        "notes" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_moderation_checks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_moderation_checks_postDraftId" FOREIGN KEY ("postDraftId") REFERENCES "post_drafts"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_post_drafts_ideaId_createdAt" ON "post_drafts" ("ideaId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_moderation_checks_postDraftId_createdAt" ON "moderation_checks" ("postDraftId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_moderation_checks_postDraftId_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_post_drafts_ideaId_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "moderation_checks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_drafts"`);
  }
}
