import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSchemaPinTable1792000000000 implements MigrationInterface {
  name = 'CreateUserSchemaPinTable1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_schema_pin\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`userId\` INT NOT NULL,
        \`schemaId\` INT NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`UQ_user_schema_pin\` (\`userId\`, \`schemaId\`),
        INDEX \`IDX_user_schema_pin_userId\` (\`userId\`),
        INDEX \`IDX_user_schema_pin_schemaId\` (\`schemaId\`),
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`schemaId\`) REFERENCES \`rating_schema\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_schema_pin\``);
  }
}
