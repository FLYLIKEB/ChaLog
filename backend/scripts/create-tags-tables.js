#!/usr/bin/env node

/**
 * tags 테이블과 note_tags 연결 테이블 생성 스크립트
 * 사용법: node scripts/create-tags-tables.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTagsTables() {
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

    // tags 테이블 생성
    console.log('🔧 tags 테이블 생성 중...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ tags 테이블 생성 완료');

    // note_tags 연결 테이블 생성
    console.log('🔧 note_tags 테이블 생성 중...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS note_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        noteId INT NOT NULL,
        tagId INT NOT NULL,
        createdAt DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_note_tag (noteId, tagId),
        INDEX idx_noteId (noteId),
        INDEX idx_tagId (tagId),
        FOREIGN KEY (noteId) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ note_tags 테이블 생성 완료');
    
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  테이블이 이미 존재합니다.');
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

createTagsTables();

