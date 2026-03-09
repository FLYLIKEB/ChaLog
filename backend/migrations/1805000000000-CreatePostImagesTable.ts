import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePostImagesTable1805000000000 implements MigrationInterface {
  name = 'CreatePostImagesTable1805000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`post_images\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`postId\` int NOT NULL,
        \`url\` varchar(500) NOT NULL,
        \`thumbnailUrl\` varchar(500) NULL,
        \`caption\` varchar(300) NULL,
        \`sortOrder\` int NOT NULL DEFAULT 0,
        INDEX \`IDX_post_images_postId\` (\`postId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`post_images\`
        ADD CONSTRAINT \`FK_post_images_postId\` FOREIGN KEY (\`postId\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`post_images\` DROP FOREIGN KEY \`FK_post_images_postId\``);
    await queryRunner.query(`DROP TABLE \`post_images\``);
  }
}
