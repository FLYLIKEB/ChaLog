import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { ConfigModule } from '@nestjs/config';
import { TestHelper } from '../helpers/test-helper';
import { TEST_CONSTANTS } from '../constants/test-constants';

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';

export interface TestContext {
  app: INestApplication;
  dataSource: DataSource;
  testHelper: TestHelper;
  testDatabaseName: string;
}

/**
 * 테스트 앱 초기화
 */
export async function setupTestApp(): Promise<TestContext> {
  // 테스트 DB URL 확인
  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!testDbUrl) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set for tests');
  }

  // 테스트 DB 이름 추출 (로깅용)
  let testDatabaseName = 'unknown';
  try {
    const url = new URL(testDbUrl);
    testDatabaseName = url.pathname.slice(1);
    console.log(`[TEST] Using test database: ${testDatabaseName}`);
    
    // 경고: 프로덕션 DB를 사용하는 경우 경고
    if (!testDatabaseName.includes('test') && !testDatabaseName.includes('_test')) {
      console.warn(`[WARNING] Test database name "${testDatabaseName}" does not contain "test". Make sure you are using a test database!`);
    }
  } catch (error) {
    console.warn('[WARNING] Could not parse database URL for validation');
  }
  
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: ['.env.test', '.env'], // 테스트용 env 파일 우선 사용
        ignoreEnvFile: false,
      }),
      AppModule,
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();
  const dataSource = moduleFixture.get<DataSource>(DataSource);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  
  // 테스트 헬퍼 초기화
  const testHelper = new TestHelper(app, dataSource);

  return {
    app,
    dataSource,
    testHelper,
    testDatabaseName,
  };
}

/**
 * 테스트 앱 종료
 */
export async function teardownTestApp(context: TestContext): Promise<void> {
  try {
    console.log(`[TEST] Cleaning up test database: ${context.testDatabaseName}`);
    await cleanupDatabase(context.dataSource);
    console.log(`[TEST] Test database cleaned up: ${context.testDatabaseName}`);
  } catch (error) {
    console.error('[ERROR] Failed to clean up test database:', error);
  } finally {
    await context.app.close();
  }
}

/**
 * 기본 스키마 및 축 생성 헬퍼 함수
 */
export async function ensureDefaultSchema(dataSource: DataSource): Promise<number | undefined> {
  let schemaResult = await dataSource.query(`
    SELECT id FROM rating_schema WHERE code = 'STANDARD' AND version = '1.0.0' LIMIT 1
  `);
  
  let schemaId: number | undefined;
  
  if (!schemaResult || schemaResult.length === 0) {
    // 기본 스키마 생성
    await dataSource.query(`
      INSERT INTO rating_schema (code, version, nameKo, nameEn, descriptionKo, descriptionEn, overallMinValue, overallMaxValue, overallStep, isActive)
      VALUES ('STANDARD', '1.0.0', '차록 표준 평가', 'ChaLog Standard Rating', '차록의 기본 평가 축 세트', 'ChaLog default rating axis set', 1, 5, 0.5, TRUE)
    `);
    
    // 생성된 스키마 ID 조회
    schemaResult = await dataSource.query(`
      SELECT id FROM rating_schema WHERE code = 'STANDARD' AND version = '1.0.0' LIMIT 1
    `);
  }
  
  schemaId = schemaResult[0]?.id;

  if (schemaId) {
    // 기본 축들이 있는지 확인
    const axesResult = await dataSource.query(`
      SELECT COUNT(*) as count FROM rating_axis WHERE schemaId = ${schemaId}
    `);
    
    // MySQL의 COUNT 결과는 [{ count: '0' }] 형태로 반환됨 (문자열)
    const axisCount = axesResult && axesResult.length > 0 ? parseInt(axesResult[0].count || '0', 10) : 0;
    
    if (axisCount === 0) {
      // 기본 축들 생성
      await dataSource.query(`
        INSERT INTO rating_axis (schemaId, code, nameKo, nameEn, descriptionKo, descriptionEn, minValue, maxValue, stepValue, displayOrder, isRequired)
        VALUES
          (${schemaId}, 'RICHNESS', '풍부함', 'Richness', '차의 풍부한 맛과 향', 'Richness of taste and aroma', 1, 5, 1, 1, TRUE),
          (${schemaId}, 'STRENGTH', '강도', 'Strength', '차의 강한 맛', 'Strength of taste', 1, 5, 1, 2, TRUE),
          (${schemaId}, 'SMOOTHNESS', '부드러움', 'Smoothness', '차의 부드러운 맛', 'Smoothness of taste', 1, 5, 1, 3, TRUE),
          (${schemaId}, 'CLARITY', '명확함', 'Clarity', '차의 명확한 맛', 'Clarity of taste', 1, 5, 1, 4, TRUE),
          (${schemaId}, 'COMPLEXITY', '복잡성', 'Complexity', '차의 복잡한 맛', 'Complexity of taste', 1, 5, 1, 5, TRUE)
      `);
    }
  }
  
  return schemaId;
}

/**
 * 공통 데이터 정리 헬퍼 함수 (외래키 제약 순서 고려)
 */
export async function cleanupDatabase(dataSource: DataSource): Promise<void> {
  try {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    // 외래키 의존성이 있는 테이블부터 삭제 (자식 테이블 먼저)
    await dataSource.query('DELETE FROM note_bookmarks');
    await dataSource.query('DELETE FROM note_likes');
    await dataSource.query('DELETE FROM note_axis_value');
    await dataSource.query('DELETE FROM note_tags');
    await dataSource.query('DELETE FROM tags');
    await dataSource.query('DELETE FROM notes');
    await dataSource.query('DELETE FROM rating_axis');
    await dataSource.query('DELETE FROM rating_schema');
    await dataSource.query('DELETE FROM teas');
    await dataSource.query('DELETE FROM user_authentications');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.error('[ERROR] Failed to clean up database:', error);
    throw error;
  }
}

