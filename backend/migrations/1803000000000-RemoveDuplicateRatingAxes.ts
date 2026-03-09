import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 차록 표준평가지표(차록 표준 평가)에서 동일 code의 중복 축을 제거합니다.
 * 각 (schemaId, code) 그룹에서 id가 가장 작은 축만 남기고 나머지는 삭제합니다.
 * note_axis_value 참조는 유지 축으로 이전합니다.
 */
export class RemoveDuplicateRatingAxes1803000000000 implements MigrationInterface {
  name = 'RemoveDuplicateRatingAxes1803000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const conn = queryRunner.connection;
    const db = conn.driver.database;

    // 1. 차록 표준평가 스키마의 중복 축 찾기 (schemaId, code별로 2개 이상인 것)
    const dupGroups = await queryRunner.query(`
      SELECT schemaId, code, GROUP_CONCAT(id ORDER BY id) as ids, MIN(id) as keptId
      FROM rating_axis ra
      WHERE schemaId IN (SELECT id FROM rating_schema WHERE nameKo = '차록 표준 평가' OR (code = 'STANDARD' AND version = '1.0.0'))
      GROUP BY schemaId, code
      HAVING COUNT(*) > 1
    `);

    for (const row of dupGroups) {
      const keptId = row.keptId;
      const allIds = (row.ids as string).split(',').map((s: string) => parseInt(s.trim(), 10));
      const duplicateIds = allIds.filter((id: number) => id !== keptId);

      if (duplicateIds.length === 0) continue;

      const dupList = duplicateIds.join(',');

      // 2. note_axis_value: kept 축에 이미 값이 있는 note의 중복 축 값은 삭제 (충돌 방지)
      await queryRunner.query(`
        DELETE nav FROM note_axis_value nav
        INNER JOIN note_axis_value kept ON nav.noteId = kept.noteId AND kept.axisId = ?
        WHERE nav.axisId IN (${dupList})
      `, [keptId]);

      // 3. 나머지 note_axis_value의 axisId를 kept로 변경
      await queryRunner.query(`
        UPDATE note_axis_value SET axisId = ? WHERE axisId IN (${dupList})
      `, [keptId]);

      // 4. 중복 축 삭제
      await queryRunner.query(`
        DELETE FROM rating_axis WHERE id IN (${dupList})
      `);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // 롤백 불가: 삭제된 중복 축 복원 정보 없음
  }
}
