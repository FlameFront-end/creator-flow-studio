import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step9AiResponseLanguage1730018000000
  implements MigrationInterface
{
  name = 'Step9AiResponseLanguage1730018000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_provider_settings"
      ADD COLUMN IF NOT EXISTS "response_language" varchar(64)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ai_provider_settings"
      DROP COLUMN IF EXISTS "response_language"
    `);
  }
}
