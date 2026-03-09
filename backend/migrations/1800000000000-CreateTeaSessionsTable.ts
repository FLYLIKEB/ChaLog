import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeaSessionsTable1800000000000 implements MigrationInterface {
  name = 'CreateTeaSessionsTable1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tea_sessions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`teaId\` int NOT NULL,
        \`noteId\` int NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_tea_sessions_userId\` (\`userId\`),
        INDEX \`IDX_tea_sessions_teaId\` (\`teaId\`),
        INDEX \`IDX_tea_sessions_createdAt\` (\`createdAt\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`tea_sessions\`
        ADD CONSTRAINT \`FK_tea_sessions_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        ADD CONSTRAINT \`FK_tea_sessions_teaId\` FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE,
        ADD CONSTRAINT \`FK_tea_sessions_noteId\` FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`tea_session_steeps\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`sessionId\` int NOT NULL,
        \`steepNumber\` int NOT NULL,
        \`steepDurationSeconds\` int NOT NULL,
        \`aroma\` varchar(255) NULL,
        \`taste\` varchar(255) NULL,
        \`color\` varchar(255) NULL,
        \`memo\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_tea_session_steeps_sessionId\` (\`sessionId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`tea_session_steeps\`
        ADD CONSTRAINT \`FK_tea_session_steeps_sessionId\` FOREIGN KEY (\`sessionId\`) REFERENCES \`tea_sessions\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`tea_session_steeps\` DROP FOREIGN KEY \`FK_tea_session_steeps_sessionId\``);
    await queryRunner.query(`DROP TABLE \`tea_session_steeps\``);

    await queryRunner.query(`ALTER TABLE \`tea_sessions\` DROP FOREIGN KEY \`FK_tea_sessions_noteId\``);
    await queryRunner.query(`ALTER TABLE \`tea_sessions\` DROP FOREIGN KEY \`FK_tea_sessions_teaId\``);
    await queryRunner.query(`ALTER TABLE \`tea_sessions\` DROP FOREIGN KEY \`FK_tea_sessions_userId\``);
    await queryRunner.query(`DROP TABLE \`tea_sessions\``);
  }
}
