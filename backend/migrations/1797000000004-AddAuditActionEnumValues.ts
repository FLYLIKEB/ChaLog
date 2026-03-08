import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditActionEnumValues1797000000004 implements MigrationInterface {
  name = 'AddAuditActionEnumValues1797000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`audit_logs\` MODIFY COLUMN \`action\` enum(
        'report_dismiss','report_action','note_delete','post_delete','comment_delete',
        'user_suspend','user_promote','user_delete',
        'tea_update','tea_delete','seller_update','seller_delete','tag_update','tag_delete','tag_merge'
      ) NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`audit_logs\` MODIFY COLUMN \`action\` enum(
        'report_dismiss','report_action','note_delete','post_delete','comment_delete',
        'user_suspend','user_promote','user_delete'
      ) NOT NULL
    `);
  }
}
