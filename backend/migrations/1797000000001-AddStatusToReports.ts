import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToReports1797000000001 implements MigrationInterface {
  name = 'AddStatusToReports1797000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const noteReportsTable = await queryRunner.getTable('note_reports');
    if (noteReportsTable) {
      const statusCol = noteReportsTable.findColumnByName('status');
      if (!statusCol) {
        await queryRunner.query(
          `ALTER TABLE \`note_reports\` ADD COLUMN \`status\` ENUM('pending', 'dismissed', 'acted') NOT NULL DEFAULT 'pending'`,
        );
      }
    }

    const postReportsTable = await queryRunner.getTable('post_reports');
    if (postReportsTable) {
      const statusCol = postReportsTable.findColumnByName('status');
      if (!statusCol) {
        await queryRunner.query(
          `ALTER TABLE \`post_reports\` ADD COLUMN \`status\` ENUM('pending', 'dismissed', 'acted') NOT NULL DEFAULT 'pending'`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const noteReportsTable = await queryRunner.getTable('note_reports');
    if (noteReportsTable) {
      const statusCol = noteReportsTable.findColumnByName('status');
      if (statusCol) {
        await queryRunner.query(`ALTER TABLE \`note_reports\` DROP COLUMN \`status\``);
      }
    }

    const postReportsTable = await queryRunner.getTable('post_reports');
    if (postReportsTable) {
      const statusCol = postReportsTable.findColumnByName('status');
      if (statusCol) {
        await queryRunner.query(`ALTER TABLE \`post_reports\` DROP COLUMN \`status\``);
      }
    }
  }
}
