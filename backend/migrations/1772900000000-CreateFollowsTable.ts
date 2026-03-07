import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFollowsTable1772900000000 implements MigrationInterface {
  name = 'CreateFollowsTable1772900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`follows\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`followerId\` INT NOT NULL,
        \`followingId\` INT NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_follower_following\` (\`followerId\`, \`followingId\`),
        INDEX \`IDX_follows_followerId\` (\`followerId\`),
        INDEX \`IDX_follows_followingId\` (\`followingId\`),
        FOREIGN KEY (\`followerId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`followingId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`follows\``);
  }
}
