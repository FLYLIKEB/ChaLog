import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 블라인드 테이스팅 세션 및 참가자 테이블 생성
 * 이슈 #47: 다회 블라인드 모드 + 참가자별 비교 리포트
 */
export class CreateBlindTastingTables1805000000000 implements MigrationInterface {
  name = 'CreateBlindTastingTables1805000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`blind_tasting_sessions\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`hostId\` INT NOT NULL,
        \`teaId\` INT NOT NULL,
        \`status\` ENUM('active', 'ended') NOT NULL DEFAULT 'active',
        \`inviteCode\` VARCHAR(32) NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`endedAt\` DATETIME(0) NULL,
        UNIQUE KEY \`UQ_blind_tasting_sessions_inviteCode\` (\`inviteCode\`),
        INDEX \`IDX_blind_tasting_sessions_hostId\` (\`hostId\`),
        INDEX \`IDX_blind_tasting_sessions_status\` (\`status\`),
        FOREIGN KEY (\`hostId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`blind_session_participants\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`sessionId\` INT NOT NULL,
        \`userId\` INT NOT NULL,
        \`noteId\` INT NULL,
        \`joinedAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`UQ_blind_session_participants_session_user\` (\`sessionId\`, \`userId\`),
        INDEX \`IDX_blind_session_participants_sessionId\` (\`sessionId\`),
        INDEX \`IDX_blind_session_participants_userId\` (\`userId\`),
        FOREIGN KEY (\`sessionId\`) REFERENCES \`blind_tasting_sessions\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`blind_session_participants\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`blind_tasting_sessions\``);
  }
}
