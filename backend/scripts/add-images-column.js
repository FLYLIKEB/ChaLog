#!/usr/bin/env node

/**
 * notes 테이블에 images 컬럼 추가 스크립트
 * 사용법: node scripts/add-images-column.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function addImagesColumn() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
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

    // 컬럼이 이미 존재하는지 확인
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'notes' 
       AND COLUMN_NAME = 'images'`,
      [config.database]
    );

    if (columns.length > 0) {
      console.log('ℹ️  images 컬럼이 이미 존재합니다.');
      return;
    }

    // images 컬럼 추가
    console.log('🔧 notes 테이블에 images 컬럼 추가 중...');
    await connection.query(`
      ALTER TABLE notes 
      ADD COLUMN images JSON NULL 
      AFTER memo
    `);
    
    console.log('✅ images 컬럼이 성공적으로 추가되었습니다.');
    
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  images 컬럼이 이미 존재합니다.');
    } else {
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('📊 데이터베이스 연결 종료');
    }
  }
}

addImagesColumn();

