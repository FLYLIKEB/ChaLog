import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProfileCustomizationFields1790000000000
  implements MigrationInterface
{
  name = 'AddProfileCustomizationFields1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const addColumnIfNotExists = async (
      table: string,
      column: string,
      definition: string,
    ) => {
      const rows: Array<Record<string, number>> = await queryRunner.query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}' LIMIT 1`,
      );
      if (rows.length === 0) {
        await queryRunner.query(
          `ALTER TABLE \`${table}\` ADD \`${column}\` ${definition}`,
        );
      }
    };

    await addColumnIfNotExists('users', 'bio', 'varchar(150) NULL');
    await addColumnIfNotExists('users', 'instagramUrl', 'varchar(500) NULL');
    await addColumnIfNotExists('users', 'blogUrl', 'varchar(500) NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const dropColumnIfExists = async (table: string, column: string) => {
      const rows: Array<Record<string, number>> = await queryRunner.query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}' LIMIT 1`,
      );
      if (rows.length > 0) {
        await queryRunner.query(
          `ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``,
        );
      }
    };

    await dropColumnIfExists('users', 'blogUrl');
    await dropColumnIfExists('users', 'instagramUrl');
    await dropColumnIfExists('users', 'bio');
  }
}
