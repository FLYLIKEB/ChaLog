import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNoteReportsTable1772900000001 implements MigrationInterface {
  name = 'CreateNoteReportsTable1772900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`note_reports\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`noteId\` INT NOT NULL,
        \`reporterId\` INT NOT NULL,
        \`reason\` ENUM('spam', 'inappropriate', 'copyright', 'other') NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`IDX_note_reports_noteId\` (\`noteId\`),
        INDEX \`IDX_note_reports_reporterId\` (\`reporterId\`),
        FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`reporterId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`note_reports\``);
  }
}
