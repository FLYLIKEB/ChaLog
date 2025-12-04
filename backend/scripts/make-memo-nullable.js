#!/usr/bin/env node

/**
 * notes 테이블의 memo 컬럼을 nullable로 변경하는 스크립트
 * 사용법: node scripts/make-memo-nullable.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function makeMemoNullable() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL 환경 변수가 설정되지 않았습니다.');
  }

  // DATABASE_URL 파싱
  const url = new URL(databaseUrl);
  const config = {
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: url.pathname.slice(1),
  };

  let connection;
  
  try {
    console.log('📊 데이터베이스 연결 중...');
    connection = await mysql.createConnection(config);
    console.log('✅ 데이터베이스 연결 성공');

    // memo 컬럼이 이미 nullable인지 확인
    const [columns] = await connection.query(
      `SELECT IS_NULLABLE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'notes' 
       AND COLUMN_NAME = 'memo'`,
      [config.database]
    );

    if (columns.length === 0) {
      throw new Error('memo 컬럼을 찾을 수 없습니다.');
    }

    if (columns[0].IS_NULLABLE === 'YES') {
      console.log('ℹ️  memo 컬럼이 이미 nullable입니다.');
      return;
    }

    // memo 컬럼을 nullable로 변경
    console.log('🔧 notes 테이블의 memo 컬럼을 nullable로 변경 중...');
    await connection.query(`
      ALTER TABLE notes 
      MODIFY COLUMN memo TEXT NULL
    `);
    
    console.log('✅ memo 컬럼이 성공적으로 nullable로 변경되었습니다.');
    
  } catch (error) {
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('📊 데이터베이스 연결 종료');
    }
  }
}

makeMemoNullable()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 에러 발생:', error.message);
    process.exit(1);
  });

