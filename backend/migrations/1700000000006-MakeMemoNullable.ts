import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeMemoNullable1700000000006 implements MigrationInterface {
  name = 'MakeMemoNullable1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // notes 테이블의 memo 컬럼을 nullable로 변경
    await queryRunner.query(`
      ALTER TABLE \`notes\` 
      MODIFY COLUMN \`memo\` TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // memo 컬럼을 다시 NOT NULL로 변경 (주의: 기존 NULL 값이 있으면 실패할 수 있음)
    await queryRunner.query(`
      ALTER TABLE \`notes\` 
      MODIFY COLUMN \`memo\` TEXT NOT NULL
    `);
  }
}

