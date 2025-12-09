#!/usr/bin/env node

/**
 * 테스트 환경 변수 설정 스크립트
 * DATABASE_URL을 기반으로 TEST_DATABASE_URL을 자동 생성
 */

const { config } = require('dotenv');
const path = require('path');

// .env 파일 로드
config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL이 설정되지 않았습니다.');
  console.error('   backend/.env 파일에 DATABASE_URL을 설정해주세요.');
  process.exit(1);
}

try {
  const url = new URL(databaseUrl);
  
  // 데이터베이스 이름에 _test 추가
  const dbName = url.pathname.slice(1); // 첫 번째 '/' 제거
  const testDbName = dbName.includes('_test') ? dbName : `${dbName}_test`;
  url.pathname = `/${testDbName}`;
  
  const testDatabaseUrl = url.toString();
  
  // 환경 변수 설정
  process.env.TEST_DATABASE_URL = testDatabaseUrl;
  process.env.NODE_ENV = 'test';
  
  console.log(`✅ TEST_DATABASE_URL이 자동으로 설정되었습니다:`);
  console.log(`   ${testDatabaseUrl}`);
  
  // Jest 실행
  const { spawn } = require('child_process');
  const jestArgs = process.argv.slice(2); // 추가 인자 전달 (예: --testPathPatterns)
  
  const jestProcess = spawn('jest', ['--config', './test/jest-e2e.json', ...jestArgs], {
    stdio: 'inherit',
    env: process.env,
    cwd: path.join(__dirname, '..'),
  });
  
  jestProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
} catch (error) {
  console.error('❌ DATABASE_URL 파싱 오류:', error.message);
  process.exit(1);
}


