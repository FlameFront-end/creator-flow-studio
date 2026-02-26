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
        'Create one concise cinematic 8-12 second vertical (9:16) video prompt for this idea. Answer only in the persona language ({{language}}), describe start/trigger/result, environment, subject action, camera movement, lighting, pace, and mood. Mention transitions or beats, keep it production-ready, and do not add hashtags, emojis, brand names or text overlays; do not switch to languages outside {{language}}.'
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
