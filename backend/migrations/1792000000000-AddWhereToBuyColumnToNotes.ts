import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhereToBuyColumnToNotes1792000000000 implements MigrationInterface {
  name = 'AddWhereToBuyColumnToNotes1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notes\`
      ADD COLUMN \`whereToBuy\` VARCHAR(500) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notes\`
      DROP COLUMN \`whereToBuy\`
    `);
  }
}
