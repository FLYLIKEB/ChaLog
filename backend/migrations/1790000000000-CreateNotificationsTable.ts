import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1790000000000 implements MigrationInterface {
  name = 'CreateNotificationsTable1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`notifications\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`type\` ENUM('note_like', 'follow') NOT NULL,
        \`actorId\` INT NOT NULL,
        \`targetId\` INT NULL,
        \`isRead\` TINYINT(1) NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_notifications_userId\` (\`userId\`),
        INDEX \`IDX_notifications_userId_isRead\` (\`userId\`, \`isRead\`),
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`actorId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`notifications\``);
  }
}
