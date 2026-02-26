import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step6VideoPrompt1730015000000 implements MigrationInterface {
  name = 'Step6VideoPrompt1730015000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ideas"
      ADD COLUMN IF NOT EXISTS "videoPrompt" text
    `);

    await queryRunner.query(`
      INSERT INTO "prompt_templates" ("key", "template")
      VALUES (
        'video_prompt',
        'Create one concise cinematic video generation prompt for a short vertical clip. Include subject action, environment, camera movement, lighting, mood, pace and visual style. Keep it specific and production-ready based on topic={{topic}}, hook={{hook}}, format={{format}}.'
      )
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "prompt_templates"
      WHERE "key" = 'video_prompt'
    `);
    await queryRunner.query(
      `ALTER TABLE "ideas" DROP COLUMN IF EXISTS "videoPrompt"`,
    );
  }
}
