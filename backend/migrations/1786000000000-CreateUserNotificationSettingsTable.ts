import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserNotificationSettingsTable1786000000000
  implements MigrationInterface
{
  name = 'CreateUserNotificationSettingsTable1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`user_notification_settings\` (
        \`userId\` INT NOT NULL,
        \`isNotificationEnabled\` TINYINT(1) NOT NULL DEFAULT 1,
        \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`userId\`),
        CONSTRAINT \`FK_user_notification_settings_userId\`
          FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`user_notification_settings\``,
    );
  }
}
