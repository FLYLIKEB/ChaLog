import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeawareIdToNotes1814000000001 implements MigrationInterface {
  name = 'AddTeawareIdToNotes1814000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notes\` ADD \`teawareId\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`notes\` ADD CONSTRAINT \`FK_notes_teaware\` FOREIGN KEY (\`teawareId\`) REFERENCES \`teaware\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`notes\` DROP FOREIGN KEY \`FK_notes_teaware\``,
    );
    await queryRunner.query(`ALTER TABLE \`notes\` DROP COLUMN \`teawareId\``);
  }
}
