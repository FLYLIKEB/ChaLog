import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateAxisStepValueToHalf1809000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE rating_axis SET stepValue = 0.5 WHERE stepValue = 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE rating_axis SET stepValue = 1 WHERE stepValue = 0.5`,
    );
  }
}
