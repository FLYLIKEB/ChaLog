import { MigrationInterface, QueryRunner } from 'typeorm';

export class RatingSchemaVersioning1700000000007 implements MigrationInterface {
  name = 'RatingSchemaVersioning1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. rating_schema 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`rating_schema\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`code\` VARCHAR(100) NOT NULL,
        \`version\` VARCHAR(50) NOT NULL,
        \`nameKo\` VARCHAR(255) NOT NULL,
        \`nameEn\` VARCHAR(255) NOT NULL,
        \`descriptionKo\` TEXT NULL,
        \`descriptionEn\` TEXT NULL,
        \`overallMinValue\` TINYINT NOT NULL,
        \`overallMaxValue\` TINYINT NOT NULL,
        \`overallStep\` DECIMAL(2,1) NOT NULL,
        \`isActive\` BOOLEAN NOT NULL DEFAULT TRUE,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`IDX_rating_schema_code_version\` (\`code\`, \`version\`),
        INDEX \`IDX_rating_schema_isActive\` (\`isActive\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. rating_axis 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`rating_axis\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`schemaId\` INT NOT NULL,
        \`code\` VARCHAR(100) NOT NULL,
        \`nameKo\` VARCHAR(255) NOT NULL,
        \`nameEn\` VARCHAR(255) NOT NULL,
        \`descriptionKo\` TEXT NULL,
        \`descriptionEn\` TEXT NULL,
        \`minValue\` TINYINT NOT NULL,
        \`maxValue\` TINYINT NOT NULL,
        \`stepValue\` DECIMAL(2,1) NOT NULL,
        \`displayOrder\` INT NOT NULL,
        \`isRequired\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`teaType\` VARCHAR(50) NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`IDX_rating_axis_schemaId\` (\`schemaId\`),
        INDEX \`IDX_rating_axis_code\` (\`code\`),
        FOREIGN KEY (\`schemaId\`) REFERENCES \`rating_schema\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. note_axis_value 테이블 생성
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`note_axis_value\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`noteId\` INT NOT NULL,
        \`axisId\` INT NOT NULL,
        \`valueNumeric\` DECIMAL(3,1) NOT NULL,
        \`createdAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_note_axis\` (\`noteId\`, \`axisId\`),
        INDEX \`IDX_note_axis_value_axisId\` (\`axisId\`),
        INDEX \`IDX_note_axis_value_axis_value\` (\`axisId\`, \`valueNumeric\`),
        FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`axisId\`) REFERENCES \`rating_axis\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 4. v1 스키마 생성 (STANDARD v1.0.0) - 이미 있으면 스킵
    await queryRunner.query(`
      INSERT IGNORE INTO \`rating_schema\` (\`code\`, \`version\`, \`nameKo\`, \`nameEn\`, \`descriptionKo\`, \`descriptionEn\`, \`overallMinValue\`, \`overallMaxValue\`, \`overallStep\`, \`isActive\`)
      VALUES ('STANDARD', '1.0.0', '차록 표준 평가', 'ChaLog Standard Rating', '차록의 기본 평가 축 세트', 'ChaLog default rating axis set', 1, 5, 0.5, TRUE)
    `);

    // 5. v1 스키마의 기본 축들 생성
    const schemaResult = await queryRunner.query(`
      SELECT \`id\` FROM \`rating_schema\` WHERE \`code\` = 'STANDARD' AND \`version\` = '1.0.0' LIMIT 1
    `);
    const schemaId = schemaResult[0]?.id;

    if (schemaId) {
      await queryRunner.query(`
        INSERT INTO \`rating_axis\` (\`schemaId\`, \`code\`, \`nameKo\`, \`nameEn\`, \`descriptionKo\`, \`descriptionEn\`, \`minValue\`, \`maxValue\`, \`stepValue\`, \`displayOrder\`, \`isRequired\`)
        VALUES
          (${schemaId}, 'RICHNESS', '풍부함', 'Richness', '차의 풍부한 맛과 향', 'Richness of taste and aroma', 1, 5, 1, 1, TRUE),
          (${schemaId}, 'STRENGTH', '강도', 'Strength', '차의 강한 맛', 'Strength of taste', 1, 5, 1, 2, TRUE),
          (${schemaId}, 'SMOOTHNESS', '부드러움', 'Smoothness', '차의 부드러운 맛', 'Smoothness of taste', 1, 5, 1, 3, TRUE),
          (${schemaId}, 'CLARITY', '명확함', 'Clarity', '차의 명확한 맛', 'Clarity of taste', 1, 5, 1, 4, TRUE),
          (${schemaId}, 'COMPLEXITY', '복잡성', 'Complexity', '차의 복잡한 맛', 'Complexity of taste', 1, 5, 1, 5, TRUE)
      `);
    }

    // 6. notes 테이블에 새 컬럼 추가 (없을 때만)
    const notesColumns = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND COLUMN_NAME IN ('schemaId', 'overallRating', 'isRatingIncluded')`,
    );
    const existingCols = new Set((notesColumns as { COLUMN_NAME: string }[]).map((r) => r.COLUMN_NAME));
    const colsToAdd: string[] = [];
    if (!existingCols.has('schemaId')) colsToAdd.push('ADD COLUMN `schemaId` INT NULL');
    if (!existingCols.has('overallRating')) colsToAdd.push('ADD COLUMN `overallRating` DECIMAL(3,1) NULL');
    if (!existingCols.has('isRatingIncluded')) colsToAdd.push('ADD COLUMN `isRatingIncluded` BOOLEAN NOT NULL DEFAULT TRUE');
    if (colsToAdd.length > 0) {
      await queryRunner.query(`ALTER TABLE \`notes\` ${colsToAdd.join(', ')}`);
    }

    // 7. 기존 notes 데이터 마이그레이션
    // 7-1. 모든 기존 노트에 schemaId 설정
    await queryRunner.query(`
      UPDATE \`notes\` SET \`schemaId\` = ${schemaId} WHERE \`schemaId\` IS NULL
    `);

    // 7-2. overallRating을 기존 rating 값으로 설정 (rating 컬럼이 있을 때만)
    const hasRatingCol = (await queryRunner.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'rating' LIMIT 1`,
    )) as unknown[];
    if (hasRatingCol.length > 0) {
      await queryRunner.query(`
        UPDATE \`notes\` SET \`overallRating\` = \`rating\` WHERE \`overallRating\` IS NULL
      `);
    }

    // 7-3. 기존 ratings JSON 데이터를 note_axis_value로 마이그레이션 (ratings 컬럼이 있을 때만)
    const hasRatingsCol = (await queryRunner.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'ratings' LIMIT 1`,
    )) as unknown[];
    const notes = hasRatingsCol.length > 0
      ? await queryRunner.query(`SELECT \`id\`, \`ratings\` FROM \`notes\` WHERE \`ratings\` IS NOT NULL`)
      : [];

    // 축 코드와 축 ID 매핑 생성
    const axisMap: Record<string, number> = {};
    const axes = await queryRunner.query(`
      SELECT \`id\`, \`code\` FROM \`rating_axis\` WHERE \`schemaId\` = ${schemaId}
    `);
    axes.forEach((axis: { id: number; code: string }) => {
      axisMap[axis.code] = axis.id;
    });

    // 각 노트의 ratings JSON을 파싱하여 note_axis_value에 저장
    for (const note of notes) {
      try {
        const ratings = typeof note.ratings === 'string' 
          ? JSON.parse(note.ratings) 
          : note.ratings;

        const axisValueInserts: string[] = [];
        
        if (ratings.richness !== undefined && axisMap.RICHNESS) {
          axisValueInserts.push(`(${note.id}, ${axisMap.RICHNESS}, ${ratings.richness})`);
        }
        if (ratings.strength !== undefined && axisMap.STRENGTH) {
          axisValueInserts.push(`(${note.id}, ${axisMap.STRENGTH}, ${ratings.strength})`);
        }
        if (ratings.smoothness !== undefined && axisMap.SMOOTHNESS) {
          axisValueInserts.push(`(${note.id}, ${axisMap.SMOOTHNESS}, ${ratings.smoothness})`);
        }
        if (ratings.clarity !== undefined && axisMap.CLARITY) {
          axisValueInserts.push(`(${note.id}, ${axisMap.CLARITY}, ${ratings.clarity})`);
        }
        if (ratings.complexity !== undefined && axisMap.COMPLEXITY) {
          axisValueInserts.push(`(${note.id}, ${axisMap.COMPLEXITY}, ${ratings.complexity})`);
        }

        if (axisValueInserts.length > 0) {
          await queryRunner.query(`
            INSERT INTO \`note_axis_value\` (\`noteId\`, \`axisId\`, \`valueNumeric\`)
            VALUES ${axisValueInserts.join(', ')}
          `);
        }
      } catch (error) {
        // JSON 파싱 실패 시 해당 노트는 스킵
        console.warn(`Failed to migrate ratings for note ${note.id}:`, error);
      }
    }

    // 8. notes 테이블의 schemaId를 NOT NULL로 변경 (아직 NULL 허용일 때만)
    const schemaIdCol = (await queryRunner.query(
      `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'schemaId' LIMIT 1`,
    )) as { IS_NULLABLE: string }[];
    if (schemaIdCol.length > 0 && schemaIdCol[0].IS_NULLABLE === 'YES') {
      await queryRunner.query(`
        ALTER TABLE \`notes\` MODIFY COLUMN \`schemaId\` INT NOT NULL
      `);
    }

    // 9. 외래키 추가 (없을 때만)
    const fkExists = (await queryRunner.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND CONSTRAINT_NAME = 'FK_notes_rating_schema' LIMIT 1`,
    )) as unknown[];
    if (fkExists.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`notes\` ADD CONSTRAINT \`FK_notes_rating_schema\` FOREIGN KEY (\`schemaId\`) REFERENCES \`rating_schema\`(\`id\`) ON DELETE RESTRICT
      `);
    }

    // 10. 인덱스 추가 (없을 때만)
    const idxExists = (await queryRunner.query(
      `SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notes' AND INDEX_NAME = 'IDX_notes_schemaId' LIMIT 1`,
    )) as unknown[];
    if (idxExists.length === 0) {
      await queryRunner.query(`CREATE INDEX \`IDX_notes_schemaId\` ON \`notes\`(\`schemaId\`)`);
    }

    // 11. 기존 ratings 컬럼 제거 (있을 때만)
    if (hasRatingsCol.length > 0) {
      await queryRunner.query(`ALTER TABLE \`notes\` DROP COLUMN \`ratings\``);
    }

    // 12. 기존 rating 컬럼 제거 (있을 때만)
    if (hasRatingCol.length > 0) {
      await queryRunner.query(`ALTER TABLE \`notes\` DROP COLUMN \`rating\``);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 역순으로 롤백

    // 1. notes 테이블에 기존 컬럼 복원
    await queryRunner.query(`
      ALTER TABLE \`notes\`
      ADD COLUMN \`rating\` DECIMAL(3,2) NULL,
      ADD COLUMN \`ratings\` JSON NULL
    `);

    // 2. 데이터 복원 (overallRating -> rating, note_axis_value -> ratings JSON)
    const schemaResult = await queryRunner.query(`
      SELECT \`id\` FROM \`rating_schema\` WHERE \`code\` = 'STANDARD' AND \`version\` = '1.0.0' LIMIT 1
    `);
    const schemaId = schemaResult[0]?.id;

    if (schemaId) {
      // 축 코드와 축 ID 매핑
      const axisMap: Record<number, string> = {};
      const axes = await queryRunner.query(`
        SELECT \`id\`, \`code\` FROM \`rating_axis\` WHERE \`schemaId\` = ${schemaId}
      `);
      axes.forEach((axis: { id: number; code: string }) => {
        axisMap[axis.id] = axis.code;
      });

      // 각 노트의 데이터 복원
      const notes = await queryRunner.query(`
        SELECT \`id\`, \`overallRating\` FROM \`notes\` WHERE \`schemaId\` = ${schemaId}
      `);

      for (const note of notes) {
        // overallRating -> rating
        if (note.overallRating !== null) {
          await queryRunner.query(`
            UPDATE \`notes\` SET \`rating\` = ${note.overallRating} WHERE \`id\` = ${note.id}
          `);
        }

        // note_axis_value -> ratings JSON
        const axisValues = await queryRunner.query(`
          SELECT \`axisId\`, \`valueNumeric\` FROM \`note_axis_value\` WHERE \`noteId\` = ${note.id}
        `);

        const ratings: Record<string, number> = {};
        axisValues.forEach((av: { axisId: number; valueNumeric: number }) => {
          const code = axisMap[av.axisId];
          if (code) {
            ratings[code.toLowerCase()] = av.valueNumeric;
          }
        });

        if (Object.keys(ratings).length > 0) {
          const ratingsJson = JSON.stringify(ratings);
          await queryRunner.query(`
            UPDATE \`notes\` SET \`ratings\` = '${ratingsJson.replace(/'/g, "''")}' WHERE \`id\` = ${note.id}
          `);
        }
      }
    }

    // 3. NULL 값을 기본값으로 업데이트 (NOT NULL 제약 추가 전)
    await queryRunner.query(`
      UPDATE \`notes\` SET \`rating\` = COALESCE(\`overallRating\`, 0.00) WHERE \`rating\` IS NULL
    `);
    await queryRunner.query(`
      UPDATE \`notes\` SET \`ratings\` = '{}' WHERE \`ratings\` IS NULL
    `);

    // 4. rating과 ratings를 NOT NULL로 변경
    await queryRunner.query(`
      ALTER TABLE \`notes\`
      MODIFY COLUMN \`rating\` DECIMAL(3,2) NOT NULL,
      MODIFY COLUMN \`ratings\` JSON NOT NULL
    `);

    // 5. 외래키 제거
    await queryRunner.query(`
      ALTER TABLE \`notes\`
      DROP FOREIGN KEY \`FK_notes_rating_schema\`
    `);

    // 6. 인덱스 제거
    await queryRunner.query(`
      DROP INDEX \`IDX_notes_schemaId\` ON \`notes\`
    `);

    // 7. 새 컬럼 제거
    await queryRunner.query(`
      ALTER TABLE \`notes\`
      DROP COLUMN \`schemaId\`,
      DROP COLUMN \`overallRating\`,
      DROP COLUMN \`isRatingIncluded\`
    `);

    // 8. 테이블 삭제 (역순)
    await queryRunner.query(`DROP TABLE IF EXISTS \`note_axis_value\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`rating_axis\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`rating_schema\``);
  }
}

