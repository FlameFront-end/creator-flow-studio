import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step8AiRunLogErrorDetails1730017000000
  implements MigrationInterface
{
  name = 'Step8AiRunLogErrorDetails1730017000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_run_logs"
      ADD COLUMN IF NOT EXISTS "errorCode" varchar(64)
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_run_logs"
      ADD COLUMN IF NOT EXISTS "rawResponse" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_run_logs"
      DROP COLUMN IF EXISTS "rawResponse"
    `);
    await queryRunner.query(`
      ALTER TABLE "ai_run_logs"
      DROP COLUMN IF EXISTS "errorCode"
    `);
  }
}

