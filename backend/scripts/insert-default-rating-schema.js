#!/usr/bin/env node

/**
 * 기본 평가 스키마 및 축 데이터 삽입 스크립트
 * 
 * 사용법:
 *   node backend/scripts/insert-default-rating-schema.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function insertDefaultRatingSchema() {
  let connection;

  try {
    // 데이터베이스 연결
    const dbUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL 또는 LOCAL_DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    }

    // MySQL URL 파싱
    const url = new URL(dbUrl.replace(/^mysql:\/\//, 'mysql://'));
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.replace(/^\//, ''),
      multipleStatements: true,
    };

    console.log('📊 데이터베이스 연결 중...');
    connection = await mysql.createConnection(config);
    console.log('✅ 데이터베이스 연결 성공\n');

    // 기존 스키마 확인
    const [existingSchemas] = await connection.query(
      `SELECT id FROM rating_schema WHERE code = 'STANDARD' AND version = '1.0.0' LIMIT 1`
    );

    let schemaId;

    if (existingSchemas && existingSchemas.length > 0) {
      schemaId = existingSchemas[0].id;
      console.log(`⚠️  기존 스키마 발견 (ID: ${schemaId})`);
      
      // 기존 축 확인
      const [existingAxes] = await connection.query(
        `SELECT COUNT(*) as count FROM rating_axis WHERE schemaId = ?`,
        [schemaId]
      );
      
      const axisCount = existingAxes[0].count;
      
      if (axisCount > 0) {
        console.log(`⚠️  기존 축 ${axisCount}개 발견`);
        console.log('❌ 이미 데이터가 존재합니다. 삭제 후 다시 실행하세요.');
        return;
      }
    } else {
      // 기본 스키마 생성
      console.log('📝 기본 스키마 생성 중...');
      const [result] = await connection.query(
        `INSERT INTO rating_schema (code, version, nameKo, nameEn, descriptionKo, descriptionEn, overallMinValue, overallMaxValue, overallStep, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'STANDARD',
          '1.0.0',
          '차록 표준 평가',
          'ChaLog Standard Rating',
          '차록의 기본 평가 축 세트',
          'ChaLog default rating axis set',
          1,
          5,
          0.5,
          true,
        ]
      );
      
      schemaId = result.insertId;
      console.log(`✅ 기본 스키마 생성 완료 (ID: ${schemaId})\n`);
    }

    // 기본 축들 생성
    console.log('📝 기본 축 생성 중...');
    const axes = [
      {
        code: 'RICHNESS',
        nameKo: '풍부함',
        nameEn: 'Richness',
        descriptionKo: '차의 풍부한 맛과 향',
        descriptionEn: 'Richness of taste and aroma',
        minValue: 1,
        maxValue: 5,
        stepValue: 1,
        displayOrder: 1,
        isRequired: true,
      },
      {
        code: 'STRENGTH',
        nameKo: '강도',
        nameEn: 'Strength',
        descriptionKo: '차의 강한 맛',
        descriptionEn: 'Strength of taste',
        minValue: 1,
        maxValue: 5,
        stepValue: 1,
        displayOrder: 2,
        isRequired: true,
      },
      {
        code: 'SMOOTHNESS',
        nameKo: '부드러움',
        nameEn: 'Smoothness',
        descriptionKo: '차의 부드러운 맛',
        descriptionEn: 'Smoothness of taste',
        minValue: 1,
        maxValue: 5,
        stepValue: 1,
        displayOrder: 3,
        isRequired: true,
      },
      {
        code: 'CLARITY',
        nameKo: '명확함',
        nameEn: 'Clarity',
        descriptionKo: '차의 명확한 맛',
        descriptionEn: 'Clarity of taste',
        minValue: 1,
        maxValue: 5,
        stepValue: 1,
        displayOrder: 4,
        isRequired: true,
      },
      {
        code: 'COMPLEXITY',
        nameKo: '복잡성',
        nameEn: 'Complexity',
        descriptionKo: '차의 복잡한 맛',
        descriptionEn: 'Complexity of taste',
        minValue: 1,
        maxValue: 5,
        stepValue: 1,
        displayOrder: 5,
        isRequired: true,
      },
    ];

    for (const axis of axes) {
      await connection.query(
        `INSERT INTO rating_axis (\`schemaId\`, \`code\`, \`nameKo\`, \`nameEn\`, \`descriptionKo\`, \`descriptionEn\`, \`minValue\`, \`maxValue\`, \`stepValue\`, \`displayOrder\`, \`isRequired\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          schemaId,
          axis.code,
          axis.nameKo,
          axis.nameEn,
          axis.descriptionKo,
          axis.descriptionEn,
          axis.minValue,
          axis.maxValue,
          axis.stepValue,
          axis.displayOrder,
          axis.isRequired,
        ]
      );
      console.log(`  ✅ ${axis.nameKo} (${axis.code}) 생성 완료`);
    }

    console.log('\n✅ 기본 평가 스키마 및 축 데이터 삽입 완료!');
    console.log(`\n📊 생성된 데이터:`);
    console.log(`   스키마 ID: ${schemaId}`);
    console.log(`   축 개수: ${axes.length}개`);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  insertDefaultRatingSchema()
    .then(() => {
      console.log('\n✨ 작업 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { insertDefaultRatingSchema };
