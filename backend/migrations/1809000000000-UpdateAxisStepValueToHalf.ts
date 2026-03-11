import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAxisStepValueToHalf1809000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE rating_axis SET step_value = 0.5 WHERE step_value = 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE rating_axis SET step_value = 1 WHERE step_value = 0.5`,
    );
  }
}
