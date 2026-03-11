import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppearanceToNotes1807000000000 implements MigrationInterface {
  name = 'AddAppearanceToNotes1807000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [columns] = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'appearance'`,
    );
    if (!columns) {
      await queryRunner.query(
        `ALTER TABLE \`notes\` ADD COLUMN \`appearance\` VARCHAR(50) NULL AFTER \`isRatingIncluded\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notes\` DROP COLUMN \`appearance\``,
    );
  }
}
