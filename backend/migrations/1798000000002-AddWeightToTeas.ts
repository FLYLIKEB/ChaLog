import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeightToTeas1798000000002 implements MigrationInterface {
  name = 'AddWeightToTeas1798000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('teas');
    const weightColumn = table?.findColumnByName('weight');

    if (!weightColumn) {
      await queryRunner.query(`
        ALTER TABLE \`teas\` 
        ADD COLUMN \`weight\` INT NULL 
        AFTER \`price\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('teas');
    const weightColumn = table?.findColumnByName('weight');

    if (weightColumn) {
      await queryRunner.query(`ALTER TABLE \`teas\` DROP COLUMN \`weight\``);
    }
  }
}
