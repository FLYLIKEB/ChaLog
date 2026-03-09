import { MigrationInterface, QueryRunner } from 'typeorm';

export class TeaSellerToSellerId1801000000000 implements MigrationInterface {
  name = 'TeaSellerToSellerId1801000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 기존 유니크 인덱스 드롭
    await queryRunner.query(`DROP INDEX \`IDX_teas_name_year_seller\` ON \`teas\``);

    // 2. sellerId 컬럼 추가 (FK는 데이터 마이그레이션 후 추가)
    await queryRunner.query(`
      ALTER TABLE \`teas\` ADD COLUMN \`sellerId\` INT NULL
    `);

    // 3. 기존 tea.seller 문자열로 sellers에서 매칭 또는 생성 후 teas.sellerId 설정
    const teas = await queryRunner.query(
      `SELECT id, seller FROM teas WHERE seller IS NOT NULL AND seller != ''`,
    );
    const sellerNameToId = new Map<string, number>();

    for (const tea of teas) {
      const name = (tea.seller as string).trim();
      if (!name) continue;

      let sellerId = sellerNameToId.get(name);
      if (sellerId == null) {
        const existing = await queryRunner.query(
          `SELECT id FROM sellers WHERE name = ? LIMIT 1`,
          [name],
        );
        if (existing.length > 0) {
          sellerId = existing[0].id as number;
        } else {
          await queryRunner.query(
            `INSERT INTO sellers (name, createdAt) VALUES (?, NOW(6))`,
            [name],
          );
          const inserted = await queryRunner.query(
            `SELECT id FROM sellers WHERE name = ? LIMIT 1`,
            [name],
          );
          sellerId = inserted[0].id as number;
        }
        sellerNameToId.set(name, sellerId);
      }
      await queryRunner.query(`UPDATE teas SET sellerId = ? WHERE id = ?`, [
        sellerId,
        tea.id,
      ]);
    }

    // 4. seller 컬럼 삭제
    await queryRunner.query(`ALTER TABLE \`teas\` DROP COLUMN \`seller\``);

    // 5. FK 제약조건 추가
    await queryRunner.query(`
      ALTER TABLE \`teas\`
      ADD CONSTRAINT \`FK_teas_sellerId\`
      FOREIGN KEY (\`sellerId\`) REFERENCES \`sellers\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // 6. (name, year, sellerId) 복합 유니크 인덱스 생성 (COALESCE로 NULL 처리)
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`IDX_teas_name_year_sellerId\` ON \`teas\` (
        \`name\`,
        (COALESCE(\`year\`, 0)),
        (COALESCE(\`sellerId\`, 0))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. 유니크 인덱스 드롭
    await queryRunner.query(
      `DROP INDEX \`IDX_teas_name_year_sellerId\` ON \`teas\``,
    );

    // 2. FK 제약조건 삭제
    await queryRunner.query(
      `ALTER TABLE \`teas\` DROP FOREIGN KEY \`FK_teas_sellerId\``,
    );

    // 3. seller 컬럼 추가
    await queryRunner.query(`
      ALTER TABLE \`teas\` ADD COLUMN \`seller\` VARCHAR(255) NULL
    `);

    // 4. sellerId → seller 문자열로 복원
    const teas = await queryRunner.query(
      `SELECT t.id, t.sellerId, s.name FROM teas t LEFT JOIN sellers s ON t.sellerId = s.id WHERE t.sellerId IS NOT NULL`,
    );
    for (const tea of teas) {
      await queryRunner.query(
        `UPDATE teas SET seller = ? WHERE id = ?`,
        [tea.name ?? null, tea.id],
      );
    }

    // 5. sellerId 컬럼 삭제
    await queryRunner.query(`ALTER TABLE \`teas\` DROP COLUMN \`sellerId\``);

    // 6. 기존 유니크 인덱스 복원
    await queryRunner.query(`
      CREATE UNIQUE INDEX \`IDX_teas_name_year_seller\` ON \`teas\` (
        \`name\`,
        (COALESCE(\`year\`, 0)),
        (COALESCE(\`seller\`, ''))
      )
    `);
  }
}
