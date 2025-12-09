import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImagesColumnToNotes1700000000005 implements MigrationInterface {
  name = 'AddImagesColumnToNotes1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // notes 테이블에 images 컬럼이 이미 존재하는지 확인
    const table = await queryRunner.getTable('notes');
    const imagesColumn = table?.findColumnByName('images');

    if (!imagesColumn) {
      await queryRunner.query(`
        ALTER TABLE \`notes\` 
        ADD COLUMN \`images\` JSON NULL 
        AFTER \`memo\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('notes');
    const imagesColumn = table?.findColumnByName('images');

    if (imagesColumn) {
      await queryRunner.query(`ALTER TABLE \`notes\` DROP COLUMN \`images\``);
    }
  }
}

