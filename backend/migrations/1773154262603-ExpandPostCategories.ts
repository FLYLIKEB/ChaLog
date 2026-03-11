import { MigrationInterface, QueryRunner } from "typeorm";

export class ExpandPostCategories1773154262603 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. enum에 새 값 추가 + tool → discussion 이름 변경
        await queryRunner.query(`
            ALTER TABLE posts
            MODIFY COLUMN category ENUM(
                'brewing_question',
                'recommendation',
                'tool',
                'discussion',
                'tea_review',
                'tool_review',
                'tea_room_review',
                'announcement',
                'bug_report'
            ) NOT NULL
        `);

        // 2. 기존 'tool' 데이터를 'discussion'으로 마이그레이션
        await queryRunner.query(`
            UPDATE posts SET category = 'discussion' WHERE category = 'tool'
        `);

        // 3. 'tool' 값을 enum에서 제거
        await queryRunner.query(`
            ALTER TABLE posts
            MODIFY COLUMN category ENUM(
                'brewing_question',
                'recommendation',
                'discussion',
                'tea_review',
                'tool_review',
                'tea_room_review',
                'announcement',
                'bug_report'
            ) NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 1. 'tool' 값을 다시 enum에 추가
        await queryRunner.query(`
            ALTER TABLE posts
            MODIFY COLUMN category ENUM(
                'brewing_question',
                'recommendation',
                'tool',
                'discussion',
                'tea_review',
                'tool_review',
                'tea_room_review',
                'announcement',
                'bug_report'
            ) NOT NULL
        `);

        // 2. 'discussion' → 'tool'로 복원
        await queryRunner.query(`
            UPDATE posts SET category = 'tool' WHERE category = 'discussion'
        `);

        // 3. 새 카테고리 제거
        await queryRunner.query(`
            ALTER TABLE posts
            MODIFY COLUMN category ENUM(
                'brewing_question',
                'recommendation',
                'tool',
                'tea_room_review',
                'announcement',
                'bug_report'
            ) NOT NULL
        `);
    }

}
