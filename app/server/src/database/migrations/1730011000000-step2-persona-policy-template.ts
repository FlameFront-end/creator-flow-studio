import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step2PersonaPolicyTemplate1730011000000 implements MigrationInterface {
  name = 'Step2PersonaPolicyTemplate1730011000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "personas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(120) NOT NULL,
        "age" integer,
        "archetypeTone" character varying(120),
        "bio" text,
        "visualCode" text,
        "voiceCode" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_personas_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "policy_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying(8) NOT NULL,
        "text" text NOT NULL,
        "severity" character varying(8) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_policy_rules_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "prompt_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying(32) NOT NULL,
        "template" text NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_prompt_templates_key" UNIQUE ("key"),
        CONSTRAINT "PK_prompt_templates_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "prompt_templates"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "policy_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "personas"`);
  }
}
