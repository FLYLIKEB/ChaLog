import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSellerDetailColumns1795000000000 implements MigrationInterface {
  name = 'AddSellerDetailColumns1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('sellers');
    if (!table) return;

    const addressCol = table.findColumnByName('address');
    if (!addressCol) {
      await queryRunner.query(
        `ALTER TABLE \`sellers\` ADD COLUMN \`address\` VARCHAR(500) NULL AFTER \`name\``,
      );
    }

    const mapUrlCol = table.findColumnByName('mapUrl');
    if (!mapUrlCol) {
      await queryRunner.query(
        `ALTER TABLE \`sellers\` ADD COLUMN \`mapUrl\` VARCHAR(2048) NULL AFTER \`address\``,
      );
    }

    const websiteUrlCol = table.findColumnByName('websiteUrl');
    if (!websiteUrlCol) {
      await queryRunner.query(
        `ALTER TABLE \`sellers\` ADD COLUMN \`websiteUrl\` VARCHAR(2048) NULL AFTER \`mapUrl\``,
      );
    }

    const phoneCol = table.findColumnByName('phone');
    if (!phoneCol) {
      await queryRunner.query(
        `ALTER TABLE \`sellers\` ADD COLUMN \`phone\` VARCHAR(50) NULL AFTER \`websiteUrl\``,
      );
    }

    const descriptionCol = table.findColumnByName('description');
    if (!descriptionCol) {
      await queryRunner.query(
        `ALTER TABLE \`sellers\` ADD COLUMN \`description\` TEXT NULL AFTER \`phone\``,
      );
    }

    const businessHoursCol = table.findColumnByName('businessHours');
    if (!businessHoursCol) {
      await queryRunner.query(
        `ALTER TABLE \`sellers\` ADD COLUMN \`businessHours\` VARCHAR(255) NULL AFTER \`description\``,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('sellers');
    if (!table) return;

    for (const col of ['businessHours', 'description', 'phone', 'websiteUrl', 'mapUrl', 'address']) {
      const c = table.findColumnByName(col);
      if (c) {
        await queryRunner.query(`ALTER TABLE \`sellers\` DROP COLUMN \`${col}\``);
      }
    }
  }
}
