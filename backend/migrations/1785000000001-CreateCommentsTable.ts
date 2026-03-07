import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCommentsTable1785000000001 implements MigrationInterface {
  name = 'CreateCommentsTable1785000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`comments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`postId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`content\` text NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_comments_postId\` (\`postId\`),
        INDEX \`IDX_comments_userId\` (\`userId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`comments\`
        ADD CONSTRAINT \`FK_comments_postId\` FOREIGN KEY (\`postId\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE,
        ADD CONSTRAINT \`FK_comments_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_comments_userId\``);
    await queryRunner.query(`ALTER TABLE \`comments\` DROP FOREIGN KEY \`FK_comments_postId\``);
    await queryRunner.query(`DROP TABLE \`comments\``);
  }
}
