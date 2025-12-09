import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTagsTables1700000000002 implements MigrationInterface {
  name = 'CreateTagsTables1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tags 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tags\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(50) NOT NULL UNIQUE,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`idx_name\` (\`name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Note Tags 연결 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`note_tags\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`noteId\` INT NOT NULL,
        \`tagId\` INT NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_note_tag\` (\`noteId\`, \`tagId\`),
        INDEX \`idx_noteId\` (\`noteId\`),
        INDEX \`idx_tagId\` (\`tagId\`),
        FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`tagId\`) REFERENCES \`tags\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`note_tags\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`tags\``);
  }
}

