import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDrinkDateToNotes1773633029395 implements MigrationInterface {
    name = 'AddDrinkDateToNotes1773633029395'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const cols = await queryRunner.query(
            `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'drinkDate'`,
        );
        if (Number(cols[0].cnt) === 0) {
            await queryRunner.query(`ALTER TABLE \`notes\` ADD \`drinkDate\` date NULL`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const cols = await queryRunner.query(
            `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'drinkDate'`,
        );
        if (Number(cols[0].cnt) > 0) {
            await queryRunner.query(`ALTER TABLE \`notes\` DROP COLUMN \`drinkDate\``);
        }
    }
}
