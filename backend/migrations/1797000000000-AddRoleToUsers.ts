import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoleToUsers1797000000000 implements MigrationInterface {
  name = 'AddRoleToUsers1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table) return;

    const roleCol = table.findColumnByName('role');
    if (!roleCol) {
      await queryRunner.query(
        `ALTER TABLE \`users\` ADD COLUMN \`role\` ENUM('user', 'admin') NOT NULL DEFAULT 'user'`,
      );
    }

    const adminUserIds = process.env.ADMIN_USER_IDS;
    if (adminUserIds && adminUserIds.trim()) {
      const ids = adminUserIds
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n > 0);
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        await queryRunner.query(
          `UPDATE \`users\` SET \`role\` = 'admin' WHERE \`id\` IN (${placeholders})`,
          ids,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table) return;

    const roleCol = table.findColumnByName('role');
    if (roleCol) {
      await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`role\``);
    }
  }
}
