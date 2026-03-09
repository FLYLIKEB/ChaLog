import { MigrationInterface, QueryRunner } from 'typeorm';

export class SteepDataJsonColumn1806000000000 implements MigrationInterface {
  name = 'SteepDataJsonColumn1806000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tea_session_steeps\` ADD COLUMN \`data\` JSON NULL AFTER \`steepDurationSeconds\`
    `);

    await queryRunner.query(`
      UPDATE \`tea_session_steeps\` SET \`data\` = JSON_OBJECT(
        'v', 1,
        'color_note', \`color\`,
        'aroma_profile', \`aroma\`,
        'body_feeling', \`taste\`,
        'memo', \`memo\`
      )
    `);

    await queryRunner.query(`
      ALTER TABLE \`tea_session_steeps\`
        DROP COLUMN \`aroma\`,
        DROP COLUMN \`taste\`,
        DROP COLUMN \`color\`,
        DROP COLUMN \`memo\`
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`tea_session_steeps\`
        ADD COLUMN \`aroma\` varchar(255) NULL AFTER \`steepDurationSeconds\`,
        ADD COLUMN \`taste\` varchar(255) NULL AFTER \`aroma\`,
        ADD COLUMN \`color\` varchar(255) NULL AFTER \`taste\`,
        ADD COLUMN \`memo\` text NULL AFTER \`color\`
    `);

    await queryRunner.query(`
      UPDATE \`tea_session_steeps\` SET
        \`aroma\` = JSON_UNQUOTE(JSON_EXTRACT(\`data\`, '$.aroma_profile')),
        \`taste\` = JSON_UNQUOTE(JSON_EXTRACT(\`data\`, '$.body_feeling')),
        \`color\` = JSON_UNQUOTE(JSON_EXTRACT(\`data\`, '$.color_note')),
        \`memo\` = JSON_UNQUOTE(JSON_EXTRACT(\`data\`, '$.memo'))
      WHERE \`data\` IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE \`tea_session_steeps\` DROP COLUMN \`data\`
    `);
  }
}
