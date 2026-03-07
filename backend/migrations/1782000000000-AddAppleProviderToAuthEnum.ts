import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppleProviderToAuthEnum1782000000000 implements MigrationInterface {
  name = 'AddAppleProviderToAuthEnum1782000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`user_authentications\`
      MODIFY COLUMN \`provider\` ENUM('email', 'kakao', 'google', 'apple', 'naver') NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // apple 사용자가 없는 경우에만 롤백 가능
    await queryRunner.query(`
      ALTER TABLE \`user_authentications\`
      MODIFY COLUMN \`provider\` ENUM('email', 'kakao', 'google', 'naver') NOT NULL
    `);
  }
}
