import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetsTable1773237302692 implements MigrationInterface {
  name = 'CreatePasswordResetsTable1773237302692';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`password_resets\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`tokenHash\` varchar(255) NOT NULL,
        \`expiresAt\` datetime NOT NULL,
        \`usedAt\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_password_resets_tokenHash\` (\`tokenHash\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    await queryRunner.query(`
      ALTER TABLE \`password_resets\`
      ADD CONSTRAINT \`FK_password_resets_userId\`
      FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`password_resets\` DROP FOREIGN KEY \`FK_password_resets_userId\``);
    await queryRunner.query(`DROP TABLE \`password_resets\``);
  }
}
