import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNoteSchemasTable1802000000000 implements MigrationInterface {
  name = 'CreateNoteSchemasTable1802000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`note_schemas\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`noteId\` INT NOT NULL,
        \`schemaId\` INT NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`UQ_note_schemas\` (\`noteId\`, \`schemaId\`),
        INDEX \`IDX_note_schemas_noteId\` (\`noteId\`),
        INDEX \`IDX_note_schemas_schemaId\` (\`schemaId\`),
        FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`schemaId\`) REFERENCES \`rating_schema\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 기존 노트의 schemaId를 note_schemas에 복사
    await queryRunner.query(`
      INSERT IGNORE INTO \`note_schemas\` (\`noteId\`, \`schemaId\`)
      SELECT \`id\`, \`schemaId\` FROM \`notes\` WHERE \`schemaId\` IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`note_schemas\``);
  }
}
