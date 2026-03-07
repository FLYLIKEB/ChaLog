import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTagFollowsTable1786000000000 implements MigrationInterface {
  name = 'CreateTagFollowsTable1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tag_follows\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`tagId\` INT NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_user_tag_follow\` (\`userId\`, \`tagId\`),
        INDEX \`IDX_tag_follows_userId\` (\`userId\`),
        INDEX \`IDX_tag_follows_tagId\` (\`tagId\`),
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`tagId\`) REFERENCES \`tags\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`tag_follows\``);
  }
}
