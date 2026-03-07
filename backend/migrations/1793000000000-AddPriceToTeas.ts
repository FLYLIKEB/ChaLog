import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceToTeas1793000000000 implements MigrationInterface {
  name = 'AddPriceToTeas1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('teas');
    const priceColumn = table?.findColumnByName('price');

    if (!priceColumn) {
      await queryRunner.query(`
        ALTER TABLE \`teas\` 
        ADD COLUMN \`price\` INT NULL 
        AFTER \`origin\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('teas');
    const priceColumn = table?.findColumnByName('price');

    if (priceColumn) {
      await queryRunner.query(`ALTER TABLE \`teas\` DROP COLUMN \`price\``);
    }
  }
}
