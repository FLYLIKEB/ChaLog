import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeaWishlistsTable1810000000000 implements MigrationInterface {
  name = 'CreateTeaWishlistsTable1810000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tea_wishlists\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`teaId\` INT NOT NULL,
        \`userId\` INT NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_tea_user_wishlist\` (\`teaId\`, \`userId\`),
        INDEX \`IDX_tea_wishlists_teaId\` (\`teaId\`),
        INDEX \`IDX_tea_wishlists_userId\` (\`userId\`),
        FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`tea_wishlists\``);
  }
}
