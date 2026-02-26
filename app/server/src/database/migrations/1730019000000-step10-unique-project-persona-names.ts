import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step10UniqueProjectPersonaNames1730019000000 implements MigrationInterface {
  name = 'Step10UniqueProjectPersonaNames1730019000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM (
            SELECT LOWER("name") AS normalized_name
            FROM "projects"
            GROUP BY LOWER("name")
            HAVING COUNT(*) > 1
          ) duplicates
        ) THEN
          RAISE EXCEPTION 'Cannot create UQ_projects_name_ci: duplicate project names exist (case-insensitive).';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM (
            SELECT LOWER("name") AS normalized_name
            FROM "personas"
            GROUP BY LOWER("name")
            HAVING COUNT(*) > 1
          ) duplicates
        ) THEN
          RAISE EXCEPTION 'Cannot create UQ_personas_name_ci: duplicate persona names exist (case-insensitive).';
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_projects_name_ci"
      ON "projects" (LOWER("name"))
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_personas_name_ci"
      ON "personas" (LOWER("name"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_personas_name_ci"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_projects_name_ci"`);
  }
}
