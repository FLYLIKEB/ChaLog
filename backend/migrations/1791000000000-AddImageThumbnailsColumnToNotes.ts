import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageThumbnailsColumnToNotes1791000000000 implements MigrationInterface {
  name = 'AddImageThumbnailsColumnToNotes1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('notes');
    const imageThumbnailsColumn = table?.findColumnByName('imageThumbnails');

    if (!imageThumbnailsColumn) {
      await queryRunner.query(`
        ALTER TABLE \`notes\` 
        ADD COLUMN \`imageThumbnails\` JSON NULL 
        AFTER \`images\`
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('notes');
    const imageThumbnailsColumn = table?.findColumnByName('imageThumbnails');

    if (imageThumbnailsColumn) {
      await queryRunner.query(`ALTER TABLE \`notes\` DROP COLUMN \`imageThumbnails\``);
    }
  }
}
