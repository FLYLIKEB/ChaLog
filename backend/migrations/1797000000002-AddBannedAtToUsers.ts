import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBannedAtToUsers1797000000002 implements MigrationInterface {
  name = 'AddBannedAtToUsers1797000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table) return;

    const bannedAtCol = table.findColumnByName('bannedAt');
    if (!bannedAtCol) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD COLUMN \`bannedAt\` DATETIME NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table) return;

    const bannedAtCol = table.findColumnByName('bannedAt');
    if (bannedAtCol) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`bannedAt\``);
    }
  }
}
