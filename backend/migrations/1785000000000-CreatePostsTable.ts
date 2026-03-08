import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePostsTable1785000000000 implements MigrationInterface {
  name = 'CreatePostsTable1785000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`posts\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`title\` varchar(200) NOT NULL,
        \`content\` text NOT NULL,
        \`category\` enum('brewing_question','recommendation','tool','tea_room_review') NOT NULL,
        \`isSponsored\` tinyint NOT NULL DEFAULT 0,
        \`sponsorNote\` varchar(300) NULL,
        \`viewCount\` int NOT NULL DEFAULT 0,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_posts_userId\` (\`userId\`),
        INDEX \`IDX_posts_category\` (\`category\`),
        INDEX \`IDX_posts_createdAt\` (\`createdAt\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`posts\`
        ADD CONSTRAINT \`FK_posts_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`post_likes\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`postId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_post_likes_postId_userId\` (\`postId\`, \`userId\`),
        INDEX \`IDX_post_likes_postId\` (\`postId\`),
        INDEX \`IDX_post_likes_userId\` (\`userId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`post_likes\`
        ADD CONSTRAINT \`FK_post_likes_postId\` FOREIGN KEY (\`postId\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE,
        ADD CONSTRAINT \`FK_post_likes_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`post_bookmarks\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`postId\` int NOT NULL,
        \`userId\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_post_bookmarks_postId_userId\` (\`postId\`, \`userId\`),
        INDEX \`IDX_post_bookmarks_postId\` (\`postId\`),
        INDEX \`IDX_post_bookmarks_userId\` (\`userId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`post_bookmarks\`
        ADD CONSTRAINT \`FK_post_bookmarks_postId\` FOREIGN KEY (\`postId\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE,
        ADD CONSTRAINT \`FK_post_bookmarks_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`post_bookmarks\` DROP FOREIGN KEY \`FK_post_bookmarks_userId\``);
    await queryRunner.query(`ALTER TABLE \`post_bookmarks\` DROP FOREIGN KEY \`FK_post_bookmarks_postId\``);
    await queryRunner.query(`DROP TABLE \`post_bookmarks\``);

    await queryRunner.query(`ALTER TABLE \`post_likes\` DROP FOREIGN KEY \`FK_post_likes_userId\``);
    await queryRunner.query(`ALTER TABLE \`post_likes\` DROP FOREIGN KEY \`FK_post_likes_postId\``);
    await queryRunner.query(`DROP TABLE \`post_likes\``);

    await queryRunner.query(`ALTER TABLE \`posts\` DROP FOREIGN KEY \`FK_posts_userId\``);
    await queryRunner.query(`DROP TABLE \`posts\``);
  }
}
