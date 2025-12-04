#!/usr/bin/env node

/**
 * tags 테이블과 note_tags 테이블 확인 스크립트
 * 사용법: node scripts/check-tags-tables.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTagsTables() {
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
    console.log('✅ 데이터베이스 연결 성공\n');

    // tags 테이블 확인
    console.log('🔍 tags 테이블 확인 중...');
    const [tagsTable] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tags'
    `, [config.database]);

    if (tagsTable.length === 0) {
      console.log('❌ tags 테이블이 존재하지 않습니다.');
    } else {
      console.log('✅ tags 테이블 존재 확인');
      console.log(`   - 생성 시간: ${tagsTable[0].CREATE_TIME}`);
      console.log(`   - 행 수: ${tagsTable[0].TABLE_ROWS || 0}`);
    }

    // tags 테이블 구조 확인
    const [tagsColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tags'
      ORDER BY ORDINAL_POSITION
    `, [config.database]);

    if (tagsColumns.length > 0) {
      console.log('\n📋 tags 테이블 구조:');
      tagsColumns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_KEY ? `(${col.COLUMN_KEY})` : ''}`);
      });
    }

    // note_tags 테이블 확인
    console.log('\n🔍 note_tags 테이블 확인 중...');
    const [noteTagsTable] = await connection.query(`
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'note_tags'
    `, [config.database]);

    if (noteTagsTable.length === 0) {
      console.log('❌ note_tags 테이블이 존재하지 않습니다.');
    } else {
      console.log('✅ note_tags 테이블 존재 확인');
      console.log(`   - 생성 시간: ${noteTagsTable[0].CREATE_TIME}`);
      console.log(`   - 행 수: ${noteTagsTable[0].TABLE_ROWS || 0}`);
    }

    // note_tags 테이블 구조 확인
    const [noteTagsColumns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'note_tags'
      ORDER BY ORDINAL_POSITION
    `, [config.database]);

    if (noteTagsColumns.length > 0) {
      console.log('\n📋 note_tags 테이블 구조:');
      noteTagsColumns.forEach(col => {
        console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_KEY ? `(${col.COLUMN_KEY})` : ''}`);
      });
    }

    // 외래 키 확인
    const [foreignKeys] = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'note_tags'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [config.database]);

    if (foreignKeys.length > 0) {
      console.log('\n🔗 외래 키 제약 조건:');
      foreignKeys.forEach(fk => {
        console.log(`   - ${fk.CONSTRAINT_NAME}: ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    }

    // 샘플 데이터 확인
    const [tagsCount] = await connection.query('SELECT COUNT(*) as count FROM tags');
    const [noteTagsCount] = await connection.query('SELECT COUNT(*) as count FROM note_tags');
    
    console.log('\n📊 데이터 현황:');
    console.log(`   - tags 테이블: ${tagsCount[0].count}개 태그`);
    console.log(`   - note_tags 테이블: ${noteTagsCount[0].count}개 연결`);
    
  } catch (error) {
    console.error('❌ 에러 발생:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📊 데이터베이스 연결 종료');
    }
  }
}

checkTagsTables();

