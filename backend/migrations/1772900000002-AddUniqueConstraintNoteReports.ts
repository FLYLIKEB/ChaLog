import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintNoteReports1772900000002 implements MigrationInterface {
  name = 'AddUniqueConstraintNoteReports1772900000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`note_reports\`
      ADD UNIQUE KEY \`UQ_note_reports_noteId_reporterId\` (\`noteId\`, \`reporterId\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`note_reports\`
      DROP INDEX \`UQ_note_reports_noteId_reporterId\`
    `);
  }
}
