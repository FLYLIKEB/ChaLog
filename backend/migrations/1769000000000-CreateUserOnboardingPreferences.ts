import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserOnboardingPreferences1769000000000 implements MigrationInterface {
    name = 'CreateUserOnboardingPreferences1769000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS \`user_onboarding_preferences\` (\`userId\` int NOT NULL, \`preferredTeaTypes\` json NULL, \`preferredFlavorTags\` json NULL, \`hasCompletedOnboarding\` tinyint NOT NULL DEFAULT 0, \`createdAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP, \`updatedAt\` datetime(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (\`userId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`user_onboarding_preferences\` ADD CONSTRAINT \`FK_user_onboarding_preferences_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_onboarding_preferences\` DROP FOREIGN KEY \`FK_user_onboarding_preferences_user\``);
        await queryRunner.query(`DROP TABLE \`user_onboarding_preferences\``);
    }
}
