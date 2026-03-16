import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerification1813000000000 implements MigrationInterface {
  name = 'AddEmailVerification1813000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`email_verification_tokens\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`tokenHash\` varchar(255) NOT NULL,
        \`expiresAt\` datetime NOT NULL,
        \`usedAt\` datetime NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_email_verification_tokens_tokenHash\` (\`tokenHash\`),
        INDEX \`IDX_email_verification_tokens_userId\` (\`userId\`),
        CONSTRAINT \`FK_email_verification_tokens_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`users\` ADD \`emailVerifiedAt\` datetime NULL
    `);

    await queryRunner.query(`
      UPDATE \`users\` SET \`emailVerifiedAt\` = \`createdAt\` WHERE \`emailVerifiedAt\` IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`emailVerifiedAt\``);
    await queryRunner.query(`DROP TABLE \`email_verification_tokens\``);
  }
}
