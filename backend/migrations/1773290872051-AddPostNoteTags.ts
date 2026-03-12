import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPostNoteTags1773290872051 implements MigrationInterface {
    name = 'AddPostNoteTags1773290872051'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`post_note_tags\` (\`postId\` int NOT NULL, \`noteId\` int NOT NULL, INDEX \`IDX_82868c0f614a06a1454a38bf26\` (\`postId\`), INDEX \`IDX_696114a87ae7f60bf5bb93e442\` (\`noteId\`), PRIMARY KEY (\`postId\`, \`noteId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`post_note_tags\` ADD CONSTRAINT \`FK_82868c0f614a06a1454a38bf266\` FOREIGN KEY (\`postId\`) REFERENCES \`posts\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE \`post_note_tags\` ADD CONSTRAINT \`FK_696114a87ae7f60bf5bb93e4429\` FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`post_note_tags\` DROP FOREIGN KEY \`FK_696114a87ae7f60bf5bb93e4429\``);
        await queryRunner.query(`ALTER TABLE \`post_note_tags\` DROP FOREIGN KEY \`FK_82868c0f614a06a1454a38bf266\``);
        await queryRunner.query(`DROP INDEX \`IDX_696114a87ae7f60bf5bb93e442\` ON \`post_note_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_82868c0f614a06a1454a38bf26\` ON \`post_note_tags\``);
        await queryRunner.query(`DROP TABLE \`post_note_tags\``);
    }
}
