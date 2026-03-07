import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePostReportsTable1785000000002 implements MigrationInterface {
  name = 'CreatePostReportsTable1785000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`post_reports\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`postId\` int NOT NULL,
        \`reporterId\` int NOT NULL,
        \`reason\` enum('spam','inappropriate','copyright','other') NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_post_reports_postId_reporterId\` (\`postId\`, \`reporterId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`post_reports\`
        ADD CONSTRAINT \`FK_post_reports_postId\` FOREIGN KEY (\`postId\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE,
        ADD CONSTRAINT \`FK_post_reports_reporterId\` FOREIGN KEY (\`reporterId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`post_reports\` DROP FOREIGN KEY \`FK_post_reports_reporterId\``);
    await queryRunner.query(`ALTER TABLE \`post_reports\` DROP FOREIGN KEY \`FK_post_reports_postId\``);
    await queryRunner.query(`DROP TABLE \`post_reports\``);
  }
}
