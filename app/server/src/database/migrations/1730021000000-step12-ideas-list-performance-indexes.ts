import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step12IdeasListPerformanceIndexes1730021000000 implements MigrationInterface {
  name = 'Step12IdeasListPerformanceIndexes1730021000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ideas_createdAt_id" ON "ideas" ("createdAt" DESC, "id" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_scripts_ideaId_status_createdAt" ON "scripts" ("ideaId", "status", "createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_captions_ideaId_status_createdAt" ON "captions" ("ideaId", "status", "createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_assets_ideaId_type_createdAt" ON "assets" ("ideaId", "type", "createdAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_assets_ideaId_type_status_createdAt" ON "assets" ("ideaId", "type", "status", "createdAt" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_assets_ideaId_type_status_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_assets_ideaId_type_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_captions_ideaId_status_createdAt"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_scripts_ideaId_status_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ideas_createdAt_id"`);
  }
}
