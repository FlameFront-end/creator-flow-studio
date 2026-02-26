import { MigrationInterface, QueryRunner } from 'typeorm';

export class Step11UsersAuth1730020000000 implements MigrationInterface {
  name = 'Step11UsersAuth1730020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(320) NOT NULL,
        "passwordHash" text NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_email_ci"
      ON "users" (LOWER("email"))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_email_ci"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
