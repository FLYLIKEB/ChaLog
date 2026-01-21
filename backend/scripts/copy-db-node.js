#!/usr/bin/env node

/**
 * 원격 DB에서 로컬 DB로 데이터 복사 스크립트 (Node.js)
 * 인증 플러그인 문제를 우회하기 위해 mysql2를 사용
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// .env 파일 로드
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// DATABASE_URL 파싱
function parseDatabaseUrl(url) {
  try {
    const urlObj = new URL(url);
    return {
      host: urlObj.hostname,
      port: parseInt(urlObj.port) || 3306,
      user: urlObj.username,
      password: decodeURIComponent(urlObj.password || ''),
      database: urlObj.pathname.slice(1).split('?')[0],
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error.message}`);
  }
}

async function copyDatabase() {
  console.log('🔄 원격 DB에서 로컬 DB로 데이터 복사 시작...\n');

  // 환경 변수 확인
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  }
  if (!process.env.LOCAL_DATABASE_URL) {
    throw new Error('LOCAL_DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  }

  // SSH 터널 확인
  const remoteConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  const localConfig = parseDatabaseUrl(process.env.LOCAL_DATABASE_URL);

  // SSH 터널을 통한 접근인 경우 호스트/포트 변경
  if (remoteConfig.host.includes('.rds.amazonaws.com')) {
    if (process.env.SSH_TUNNEL_LOCAL_PORT) {
      remoteConfig.host = '127.0.0.1';
      remoteConfig.port = parseInt(process.env.SSH_TUNNEL_LOCAL_PORT) || 3307;
      console.log('🔗 SSH 터널을 통한 접근 사용');
      console.log(`   원격 DB: ${remoteConfig.host}:${remoteConfig.port}/${remoteConfig.database}\n`);
    }
  }

  console.log('📋 연결 정보:');
  console.log(`   원격: ${remoteConfig.host}:${remoteConfig.port}/${remoteConfig.database}`);
  console.log(`   로컬: ${localConfig.host}:${localConfig.port}/${localConfig.database}\n`);

  // 원격 DB 연결
  console.log('📥 원격 DB 연결 중...');
  const remoteConn = await mysql.createConnection({
    host: remoteConfig.host,
    port: remoteConfig.port,
    user: remoteConfig.user,
    password: remoteConfig.password,
    database: remoteConfig.database,
    connectTimeout: 10000,
  });
  console.log('✅ 원격 DB 연결 성공\n');

  // 로컬 DB 연결
  console.log('📤 로컬 DB 연결 중...');
  const localConn = await mysql.createConnection({
    host: localConfig.host,
    port: localConfig.port,
    user: localConfig.user,
    password: localConfig.password,
    connectTimeout: 10000,
  });
  
  // 로컬 DB 생성
  await localConn.query(`CREATE DATABASE IF NOT EXISTS \`${localConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await localConn.query(`USE \`${localConfig.database}\``);
  console.log('✅ 로컬 DB 연결 성공\n');

  // 테이블 목록 가져오기
  console.log('📊 테이블 목록 조회 중...');
  const [tables] = await remoteConn.query('SHOW TABLES');
  const tableNames = tables.map(row => Object.values(row)[0]);
  console.log(`   발견된 테이블: ${tableNames.length}개\n`);

  if (tableNames.length === 0) {
    console.log('⚠️  복사할 테이블이 없습니다.');
    await remoteConn.end();
    await localConn.end();
    return;
  }

  // 각 테이블 복사
  for (const tableName of tableNames) {
    console.log(`📋 테이블 복사 중: ${tableName}`);
    
    try {
      // 테이블 구조 가져오기
      const [createTable] = await remoteConn.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSql = createTable[0]['Create Table'];
      
      // 로컬에 테이블 생성 (기존 테이블 삭제)
      await localConn.query(`DROP TABLE IF EXISTS \`${tableName}\``);
      await localConn.query(createTableSql);
      
      // 데이터 가져오기
      const [rows] = await remoteConn.query(`SELECT * FROM \`${tableName}\``);
      
      if (rows.length > 0) {
        // 컬럼 이름 가져오기
        const columns = Object.keys(rows[0]);
        const columnsStr = columns.map(col => `\`${col}\``).join(', ');
        
        // 배치로 INSERT
        const placeholders = columns.map(() => '?').join(', ');
        const insertSql = `INSERT INTO \`${tableName}\` (${columnsStr}) VALUES (${placeholders})`;
        
        // 데이터 변환 (Date 객체 등 처리)
        const values = rows.map(row => 
          columns.map(col => {
            const val = row[col];
            if (val instanceof Date) {
              return val.toISOString().slice(0, 19).replace('T', ' ');
            }
            return val;
          })
        );
        
        // 배치 INSERT (1000개씩)
        const batchSize = 1000;
        for (let i = 0; i < values.length; i += batchSize) {
          const batch = values.slice(i, i + batchSize);
          await localConn.query(insertSql, batch);
        }
        
        console.log(`   ✅ ${rows.length}개 행 복사 완료`);
      } else {
        console.log(`   ✅ 테이블 구조만 복사 (데이터 없음)`);
      }
    } catch (error) {
      console.error(`   ❌ 오류: ${error.message}`);
    }
  }

  // 연결 종료
  await remoteConn.end();
  await localConn.end();

  console.log('\n✅ 데이터 복사 완료!');
  console.log(`\n📊 복사된 테이블: ${tableNames.length}개`);
}

// 실행
copyDatabase().catch(error => {
  console.error('❌ 오류 발생:', error.message);
  process.exit(1);
});
