import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCellarItemsTable1773000000000 implements MigrationInterface {
    name = 'CreateCellarItemsTable1773000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`cellar_items\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`userId\` int NOT NULL,
                \`teaId\` int NOT NULL,
                \`quantity\` decimal(8,1) NOT NULL DEFAULT '0.0',
                \`unit\` varchar(20) NOT NULL DEFAULT 'g',
                \`openedAt\` date NULL,
                \`remindAt\` date NULL,
                \`memo\` text NULL,
                \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                \`updatedAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        const checkAndAddFK = async (constraintName: string, sql: string) => {
            const [result] = await queryRunner.query(
                `SELECT COUNT(*) as cnt FROM information_schema.TABLE_CONSTRAINTS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cellar_items'
                 AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
                [constraintName]
            );
            if (result.cnt === 0) {
                await queryRunner.query(sql);
            }
        };

        await checkAndAddFK('FK_cellar_items_user', `
            ALTER TABLE \`cellar_items\`
            ADD CONSTRAINT \`FK_cellar_items_user\`
            FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await checkAndAddFK('FK_cellar_items_tea', `
            ALTER TABLE \`cellar_items\`
            ADD CONSTRAINT \`FK_cellar_items_tea\`
            FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE RESTRICT ON UPDATE NO ACTION
        `);

        const checkAndCreateIndex = async (indexName: string, sql: string) => {
            const [result] = await queryRunner.query(
                `SELECT COUNT(*) as cnt FROM information_schema.STATISTICS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cellar_items' AND INDEX_NAME = ?`,
                [indexName]
            );
            if (result.cnt === 0) {
                await queryRunner.query(sql);
            }
        };

        await checkAndCreateIndex(
            'IDX_cellar_items_userId',
            'CREATE INDEX `IDX_cellar_items_userId` ON `cellar_items` (`userId`)'
        );
        await checkAndCreateIndex(
            'IDX_cellar_items_remindAt',
            'CREATE INDEX `IDX_cellar_items_remindAt` ON `cellar_items` (`remindAt`)'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS \`IDX_cellar_items_remindAt\` ON \`cellar_items\``);
        await queryRunner.query(`DROP INDEX IF EXISTS \`IDX_cellar_items_userId\` ON \`cellar_items\``);
        await queryRunner.query(`
            ALTER TABLE \`cellar_items\`
            DROP FOREIGN KEY IF EXISTS \`FK_cellar_items_tea\`
        `);
        await queryRunner.query(`
            ALTER TABLE \`cellar_items\`
            DROP FOREIGN KEY IF EXISTS \`FK_cellar_items_user\`
        `);
        await queryRunner.query(`DROP TABLE IF EXISTS \`cellar_items\``);
    }
}
