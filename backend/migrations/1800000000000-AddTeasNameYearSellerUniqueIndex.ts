import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeasNameYearSellerUniqueIndex1800000000000 implements MigrationInterface {
  name = 'AddTeasNameYearSellerUniqueIndex1800000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // name, year, seller 조합 중복 방지 (NULL은 COALESCE로 처리)
    // 기존 중복 데이터가 있으면 마이그레이션 실패 → 수동 정리 후 재실행
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`IDX_teas_name_year_seller\` ON \`teas\` (
        \`name\`,
        (COALESCE(\`year\`, 0)),
        (COALESCE(\`seller\`, ''))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_teas_name_year_seller\` ON \`teas\``);
  }
}
