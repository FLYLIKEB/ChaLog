import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * isAnonymous 컬럼이 없을 경우에만 추가 (이미 1798000000000이 적용된 DB에서는 no-op)
 * 마이그레이션 DB와 앱 DB 불일치 등으로 컬럼이 없는 환경 복구용
 */
export class EnsureIsAnonymousColumnExists1798000000001 implements MigrationInterface {
  name = 'EnsureIsAnonymousColumnExists1798000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'posts'
        AND column_name = 'isAnonymous'
    `);

    if (!rows || rows.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`posts\`
          ADD COLUMN \`isAnonymous\` tinyint NOT NULL DEFAULT 0
      `);
    }
  }

  public async down(): Promise<void> {
    // 복구용 마이그레이션이므로 down은 비움 (원본 1798000000000의 down 사용)
  }
}
