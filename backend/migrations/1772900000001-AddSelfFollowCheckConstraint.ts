import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSelfFollowCheckConstraint1772900000001 implements MigrationInterface {
  name = 'AddSelfFollowCheckConstraint1772900000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`follows\`
        ADD CONSTRAINT \`chk_no_self_follow\` CHECK (\`followerId\` <> \`followingId\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`follows\`
        DROP CHECK \`chk_no_self_follow\`
    `);
  }
}
