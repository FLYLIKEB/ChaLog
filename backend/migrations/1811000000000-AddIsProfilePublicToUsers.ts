import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsProfilePublicToUsers1811000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const column = table?.findColumnByName('isProfilePublic');
    if (!column) {
      await queryRunner.query(
        `ALTER TABLE users ADD COLUMN isProfilePublic tinyint(1) NOT NULL DEFAULT 1`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN isProfilePublic`);
  }
}
