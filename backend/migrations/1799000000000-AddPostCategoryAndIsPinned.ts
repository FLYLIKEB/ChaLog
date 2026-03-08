import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPostCategoryAndIsPinned1799000000000 implements MigrationInterface {
  name = 'AddPostCategoryAndIsPinned1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`posts\`
        MODIFY COLUMN \`category\` enum('brewing_question','recommendation','tool','tea_room_review','announcement','bug_report') NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE \`posts\`
        ADD COLUMN \`isPinned\` tinyint NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`posts\`
        DROP COLUMN \`isPinned\`
    `);
    await queryRunner.query(`
      ALTER TABLE \`posts\`
        MODIFY COLUMN \`category\` enum('brewing_question','recommendation','tool','tea_room_review') NOT NULL
    `);
  }
}
