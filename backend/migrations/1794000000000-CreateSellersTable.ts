import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSellersTable1794000000000 implements MigrationInterface {
  name = 'CreateSellersTable1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('sellers');
    if (!table) {
      await queryRunner.query(`
        CREATE TABLE \`sellers\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(255) NOT NULL,
          \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`UQ_sellers_name\` (\`name\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('sellers');
    if (table) {
      await queryRunner.query(`DROP TABLE \`sellers\``);
    }
  }
}
