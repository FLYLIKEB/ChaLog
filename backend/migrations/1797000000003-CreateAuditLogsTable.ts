import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1797000000003 implements MigrationInterface {
  name = 'CreateAuditLogsTable1797000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`audit_logs\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`adminId\` int NOT NULL,
        \`action\` enum('report_dismiss','report_action','note_delete','post_delete','comment_delete','user_suspend','user_promote','user_delete') NOT NULL,
        \`targetType\` varchar(50) NULL,
        \`targetId\` int NULL,
        \`reason\` text NULL,
        \`metadata\` json NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_audit_logs_adminId\` (\`adminId\`),
        INDEX \`IDX_audit_logs_action\` (\`action\`),
        INDEX \`IDX_audit_logs_createdAt\` (\`createdAt\`)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`audit_logs\``);
  }
}
