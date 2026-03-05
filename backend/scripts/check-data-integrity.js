#!/usr/bin/env node

/**
 * 데이터베이스 데이터 정합성 확인 스크립트
 * 외래 키 제약 조건 위반, 고아 레코드 등을 확인합니다.
 */

const mysql = require('mysql2/promise');
const { URL } = require('url');

// 색상 출력을 위한 유틸리티
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkDataIntegrity() {
  let connection;

  try {
    // 환경 변수에서 데이터베이스 URL 가져오기
    const databaseUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      log('❌ DATABASE_URL 또는 LOCAL_DATABASE_URL 환경 변수가 설정되지 않았습니다.', 'red');
      process.exit(1);
    }

    // URL 파싱
    const url = new URL(databaseUrl);
    const hostname = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : 3306;
    const username = url.username;
    const password = url.password;
    const database = url.pathname.slice(1);

    log(`\n🔍 데이터 정합성 확인 시작...`, 'cyan');
    log(`📊 데이터베이스: ${database}`, 'blue');
    log(`🌐 호스트: ${hostname}:${port}\n`, 'blue');

    // 데이터베이스 연결
    connection = await mysql.createConnection({
      host: hostname,
      port: port,
      user: username,
      password: password,
      database: database,
    });

    const issues = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // 외래 키 제약 조건 확인 함수
    async function checkForeignKey(table, column, referencedTable, referencedColumn = 'id') {
      totalChecks++;
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM \`${table}\` t 
         LEFT JOIN \`${referencedTable}\` r ON t.\`${column}\` = r.\`${referencedColumn}\`
         WHERE t.\`${column}\` IS NOT NULL AND r.\`${referencedColumn}\` IS NULL`
      );

      const count = rows[0].count;
      if (count > 0) {
        const [details] = await connection.query(
          `SELECT t.\`${column}\` FROM \`${table}\` t 
           LEFT JOIN \`${referencedTable}\` r ON t.\`${column}\` = r.\`${referencedColumn}\`
           WHERE t.\`${column}\` IS NOT NULL AND r.\`${referencedColumn}\` IS NULL
           LIMIT 10`
        );
        
        issues.push({
          table,
          column,
          referencedTable,
          count,
          details: details.map(row => row[column]),
        });
        log(`  ❌ ${table}.${column} -> ${referencedTable}.${referencedColumn}: ${count}개 위반`, 'red');
        return false;
      } else {
        passedChecks++;
        log(`  ✅ ${table}.${column} -> ${referencedTable}.${referencedColumn}: 정상`, 'green');
        return true;
      }
    }

    // 외래 키 제약 조건 확인
    log('📋 외래 키 제약 조건 확인:', 'yellow');
    
    await checkForeignKey('user_authentications', 'userId', 'users');
    await checkForeignKey('notes', 'userId', 'users');
    await checkForeignKey('notes', 'teaId', 'teas');
    await checkForeignKey('notes', 'schemaId', 'rating_schema');
    await checkForeignKey('note_tags', 'noteId', 'notes');
    await checkForeignKey('note_tags', 'tagId', 'tags');
    await checkForeignKey('note_axis_value', 'noteId', 'notes');
    await checkForeignKey('note_axis_value', 'axisId', 'rating_axis');
    await checkForeignKey('rating_axis', 'schemaId', 'rating_schema');
    await checkForeignKey('note_likes', 'noteId', 'notes');
    await checkForeignKey('note_likes', 'userId', 'users');
    await checkForeignKey('note_bookmarks', 'noteId', 'notes');
    await checkForeignKey('note_bookmarks', 'userId', 'users');
    await checkForeignKey('user_onboarding_preferences', 'userId', 'users');

    // NULL 제약 조건 확인
    log('\n📋 NULL 제약 조건 확인:', 'yellow');
    totalChecks++;
    
    const [nullChecks] = await connection.query(`
      SELECT 
        'notes' as table_name,
        COUNT(*) as null_count
      FROM notes 
      WHERE userId IS NULL OR teaId IS NULL OR schemaId IS NULL
      UNION ALL
      SELECT 
        'user_authentications' as table_name,
        COUNT(*) as null_count
      FROM user_authentications 
      WHERE userId IS NULL
      UNION ALL
      SELECT 
        'note_tags' as table_name,
        COUNT(*) as null_count
      FROM note_tags 
      WHERE noteId IS NULL OR tagId IS NULL
      UNION ALL
      SELECT 
        'note_axis_value' as table_name,
        COUNT(*) as null_count
      FROM note_axis_value 
      WHERE noteId IS NULL OR axisId IS NULL
      UNION ALL
      SELECT 
        'rating_axis' as table_name,
        COUNT(*) as null_count
      FROM rating_axis 
      WHERE schemaId IS NULL
      UNION ALL
      SELECT 
        'note_likes' as table_name,
        COUNT(*) as null_count
      FROM note_likes 
      WHERE noteId IS NULL OR userId IS NULL
      UNION ALL
      SELECT 
        'note_bookmarks' as table_name,
        COUNT(*) as null_count
      FROM note_bookmarks 
      WHERE noteId IS NULL OR userId IS NULL
      UNION ALL
      SELECT 
        'user_onboarding_preferences' as table_name,
        COUNT(*) as null_count
      FROM user_onboarding_preferences 
      WHERE userId IS NULL
    `);

    let hasNullIssues = false;
    nullChecks.forEach(row => {
      if (row.null_count > 0) {
        hasNullIssues = true;
        log(`  ❌ ${row.table_name}: ${row.null_count}개의 NULL 값 발견`, 'red');
      }
    });

    if (!hasNullIssues) {
      passedChecks++;
      log(`  ✅ NULL 제약 조건: 정상`, 'green');
    }

    // 고유 제약 조건 확인 (user_authentications의 provider + providerId)
    log('\n📋 고유 제약 조건 확인:', 'yellow');
    totalChecks++;
    
    const [uniqueChecks] = await connection.query(`
      SELECT provider, providerId, COUNT(*) as count
      FROM user_authentications
      GROUP BY provider, providerId
      HAVING COUNT(*) > 1
    `);

    if (uniqueChecks.length > 0) {
      log(`  ❌ user_authentications: ${uniqueChecks.length}개의 중복된 (provider, providerId) 조합 발견`, 'red');
      uniqueChecks.forEach(row => {
        log(`     - ${row.provider}:${row.providerId} (${row.count}개)`, 'red');
      });
    } else {
      passedChecks++;
      log(`  ✅ user_authentications (provider, providerId): 정상`, 'green');
    }

    // 요약 출력
    log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
    if (issues.length === 0 && !hasNullIssues && uniqueChecks.length === 0) {
      log(`✅ 모든 정합성 검사 통과! (${passedChecks}/${totalChecks})`, 'green');
    } else {
      log(`⚠️  정합성 문제 발견: ${issues.length + (hasNullIssues ? 1 : 0) + uniqueChecks.length}개`, 'yellow');
      log(`   통과: ${passedChecks}/${totalChecks}`, 'yellow');
      
      if (issues.length > 0) {
        log('\n📝 상세 정보:', 'yellow');
        issues.forEach(issue => {
          log(`\n  테이블: ${issue.table}.${issue.column}`, 'red');
          log(`  참조: ${issue.referencedTable}.${issue.referencedColumn}`, 'red');
          log(`  위반 개수: ${issue.count}`, 'red');
          if (issue.details.length > 0) {
            log(`  예시 값: ${issue.details.join(', ')}${issue.count > 10 ? ' ...' : ''}`, 'red');
          }
        });
      }
    }
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', 'cyan');

  } catch (error) {
    log(`\n❌ 오류 발생: ${error.message}`, 'red');
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 스크립트 실행
checkDataIntegrity();
