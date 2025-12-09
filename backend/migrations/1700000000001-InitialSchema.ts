import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000001 implements MigrationInterface {
  name = 'InitialSchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Users 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // User Authentications 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_authentications\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`provider\` ENUM('email', 'kakao', 'google', 'naver') NOT NULL,
        \`providerId\` VARCHAR(255) NOT NULL,
        \`credential\` VARCHAR(255) NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_provider_providerId\` (\`provider\`, \`providerId\`),
        INDEX \`IDX_user_authentications_userId\` (\`userId\`),
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Teas 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`teas\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`year\` INT NULL,
        \`type\` VARCHAR(255) NOT NULL,
        \`seller\` VARCHAR(255) NULL,
        \`origin\` VARCHAR(255) NULL,
        \`averageRating\` DECIMAL(3,2) NOT NULL DEFAULT 0.00,
        \`reviewCount\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`IDX_teas_name\` (\`name\`),
        INDEX \`IDX_teas_type\` (\`type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Notes 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`notes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`teaId\` INT NOT NULL,
        \`userId\` INT NOT NULL,
        \`rating\` DECIMAL(3,2) NOT NULL,
        \`ratings\` JSON NOT NULL,
        \`memo\` TEXT NOT NULL,
        \`isPublic\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`IDX_notes_teaId\` (\`teaId\`),
        INDEX \`IDX_notes_userId\` (\`userId\`),
        INDEX \`IDX_notes_isPublic\` (\`isPublic\`),
        INDEX \`IDX_notes_createdAt\` (\`createdAt\`),
        FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 역순으로 삭제 (외래키 제약조건 때문에)
    await queryRunner.query(`DROP TABLE IF EXISTS \`notes\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`teas\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_authentications\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
  }
}

