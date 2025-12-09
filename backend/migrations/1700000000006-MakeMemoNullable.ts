import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeMemoNullable1700000000006 implements MigrationInterface {
  name = 'MakeMemoNullable1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // notes 테이블의 memo 컬럼을 nullable로 변경 (이미 nullable이 아닌 경우에만)
    const table = await queryRunner.getTable('notes');
    const memoColumn = table?.findColumnByName('memo');
    
    if (memoColumn && !memoColumn.isNullable) {
      await queryRunner.query(`
        ALTER TABLE \`notes\` 
        MODIFY COLUMN \`memo\` TEXT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 기존 NULL 값을 빈 문자열로 변환
    await queryRunner.query(`
      UPDATE \`notes\` SET \`memo\` = '' WHERE \`memo\` IS NULL
    `);
    // memo 컬럼을 다시 NOT NULL로 변경
    await queryRunner.query(`
      ALTER TABLE \`notes\` 
      MODIFY COLUMN \`memo\` TEXT NOT NULL
    `);
  }
}

