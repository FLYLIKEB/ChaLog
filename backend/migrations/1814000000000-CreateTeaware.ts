import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeaware1814000000000 implements MigrationInterface {
  name = 'CreateTeaware1814000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`teaware\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`name\` VARCHAR(100) NOT NULL,
        \`category\` ENUM('ZISHA_HU','GAIWAN','GONGDAO_BEI','CUP','FAIRNESS_CUP','TEA_TRAY','OTHER') NOT NULL,
        \`capacity\` DECIMAL(6,1) NULL,
        \`material\` VARCHAR(100) NULL,
        \`memo\` TEXT NULL,
        \`isPinned\` TINYINT(1) NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_teaware_userId\` (\`userId\`),
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`teaware\``);
  }
}
