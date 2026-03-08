import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsAnonymousToPosts1798000000000 implements MigrationInterface {
  name = 'AddIsAnonymousToPosts1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`posts\`
        ADD COLUMN \`isAnonymous\` tinyint NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`posts\`
        DROP COLUMN \`isAnonymous\`
    `);
  }
}
