import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTeaTypes1808000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. teas 테이블: 우롱차 → 청차/우롱차
    await queryRunner.query(
      `UPDATE teas SET type = '청차/우롱차' WHERE type = '우롱차'`,
    );

    // 2. teas 테이블: 흑차 → 흑차/보이차
    await queryRunner.query(
      `UPDATE teas SET type = '흑차/보이차' WHERE type = '흑차'`,
    );

    // 3. teas 테이블: 보이차 → 흑차/보이차
    await queryRunner.query(
      `UPDATE teas SET type = '흑차/보이차' WHERE type = '보이차'`,
    );

    // 4. user_onboarding_preferences: preferredTeaTypes JSON 배열 내 값 변환
    await queryRunner.query(
      `UPDATE user_onboarding_preferences
       SET preferredTeaTypes = REPLACE(preferredTeaTypes, '"우롱차"', '"청차/우롱차"')
       WHERE preferredTeaTypes LIKE '%"우롱차"%'`,
    );

    await queryRunner.query(
      `UPDATE user_onboarding_preferences
       SET preferredTeaTypes = REPLACE(preferredTeaTypes, '"흑차"', '"흑차/보이차"')
       WHERE preferredTeaTypes LIKE '%"흑차"%'`,
    );

    await queryRunner.query(
      `UPDATE user_onboarding_preferences
       SET preferredTeaTypes = REPLACE(preferredTeaTypes, '"보이차"', '"흑차/보이차"')
       WHERE preferredTeaTypes LIKE '%"보이차"%'`,
    );

    // 5. 중복 제거: "흑차"와 "보이차" 둘 다 있었으면 "흑차/보이차"가 2개 됨
    // "흑차/보이차","흑차/보이차" → "흑차/보이차" (연속 중복 제거)
    await queryRunner.query(
      `UPDATE user_onboarding_preferences
       SET preferredTeaTypes = REPLACE(preferredTeaTypes, '"흑차/보이차","흑차/보이차"', '"흑차/보이차"')
       WHERE preferredTeaTypes LIKE '%"흑차/보이차","흑차/보이차"%'`,
    );
    // 공백 포함 변형도 처리
    await queryRunner.query(
      `UPDATE user_onboarding_preferences
       SET preferredTeaTypes = REPLACE(preferredTeaTypes, '"흑차/보이차", "흑차/보이차"', '"흑차/보이차"')
       WHERE preferredTeaTypes LIKE '%"흑차/보이차", "흑차/보이차"%'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE teas SET type = '우롱차' WHERE type = '청차/우롱차'`,
    );
    await queryRunner.query(
      `UPDATE teas SET type = '흑차' WHERE type = '흑차/보이차'`,
    );

    await queryRunner.query(
      `UPDATE user_onboarding_preferences
       SET preferredTeaTypes = REPLACE(preferredTeaTypes, '"청차/우롱차"', '"우롱차"')
       WHERE preferredTeaTypes LIKE '%"청차/우롱차"%'`,
    );
    await queryRunner.query(
      `UPDATE user_onboarding_preferences
       SET preferredTeaTypes = REPLACE(preferredTeaTypes, '"흑차/보이차"', '"흑차"')
       WHERE preferredTeaTypes LIKE '%"흑차/보이차"%'`,
    );
  }
}
