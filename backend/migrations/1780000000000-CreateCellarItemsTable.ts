import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCellarItemsTable1780000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`cellar_items\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`teaId\` int NOT NULL,
        \`quantity\` decimal(8,1) NOT NULL DEFAULT '0.0',
        \`unit\` varchar(10) NOT NULL DEFAULT 'g',
        \`openedAt\` date NULL,
        \`remindAt\` datetime NULL,
        \`memo\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_cellar_items_userId\` (\`userId\`),
        INDEX \`IDX_cellar_items_remindAt\` (\`remindAt\`),
        CONSTRAINT \`FK_cellar_items_userId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_cellar_items_teaId\` FOREIGN KEY (\`teaId\`) REFERENCES \`teas\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`cellar_items\``);
  }
}
