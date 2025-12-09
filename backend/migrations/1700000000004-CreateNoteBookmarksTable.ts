import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNoteBookmarksTable1700000000004 implements MigrationInterface {
  name = 'CreateNoteBookmarksTable1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`note_bookmarks\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`noteId\` INT NOT NULL,
        \`userId\` INT NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_note_user_bookmark\` (\`noteId\`, \`userId\`),
        INDEX \`IDX_note_bookmarks_noteId\` (\`noteId\`),
        INDEX \`IDX_note_bookmarks_userId\` (\`userId\`),
        FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`note_bookmarks\``);
  }
}

