import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * rating_axis에 (schemaId, code) 유니크 제약 추가
 * 동일 스키마 내 동일 code의 지표 중복 생성 방지
 */
export class AddUniqueRatingAxisSchemaCode1804000000000 implements MigrationInterface {
  name = 'AddUniqueRatingAxisSchemaCode1804000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`rating_axis\`
      ADD UNIQUE KEY \`UQ_rating_axis_schemaId_code\` (\`schemaId\`, \`code\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`rating_axis\`
      DROP INDEX \`UQ_rating_axis_schemaId_code\`
    `);
  }
}
