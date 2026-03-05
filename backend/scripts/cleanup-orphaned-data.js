#!/usr/bin/env node

/**
 * 고아 레코드 정리 스크립트
 * 외래 키 제약 조건을 위반하는 레코드를 삭제합니다.
 */

const mysql = require('mysql2/promise');
const { URL } = require('url');
const readline = require('readline');

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

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function cleanupOrphanedData() {
  let connection;

  try {
    const databaseUrl = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      log('❌ DATABASE_URL 또는 LOCAL_DATABASE_URL 환경 변수가 설정되지 않았습니다.', 'red');
      process.exit(1);
    }

    const url = new URL(databaseUrl);
    const hostname = url.hostname;
    const port = url.port ? parseInt(url.port, 10) : 3306;
    const username = url.username;
    const password = url.password;
    const database = url.pathname.slice(1);

    log(`\n🧹 고아 레코드 정리 시작...`, 'cyan');
    log(`📊 데이터베이스: ${database}`, 'blue');
    log(`🌐 호스트: ${hostname}:${port}\n`, 'blue');

    connection = await mysql.createConnection({
      host: hostname,
      port: port,
      user: username,
      password: password,
      database: database,
    });

    // user_onboarding_preferences 고아 레코드 확인
    const [orphaned] = await connection.query(`
      SELECT COUNT(*) as count, MIN(userId) as min_id, MAX(userId) as max_id
      FROM user_onboarding_preferences uop
      LEFT JOIN users u ON uop.userId = u.id
      WHERE u.id IS NULL
    `);

    const orphanedCount = orphaned[0].count;
    
    if (orphanedCount === 0) {
      log('✅ 고아 레코드가 없습니다.', 'green');
      return;
    }

    log(`⚠️  발견된 고아 레코드:`, 'yellow');
    log(`   테이블: user_onboarding_preferences`, 'yellow');
    log(`   개수: ${orphanedCount}개`, 'yellow');
    log(`   userId 범위: ${orphaned[0].min_id} ~ ${orphaned[0].max_id}`, 'yellow');

    // 사용자 확인
    const answer = await askQuestion('\n이 고아 레코드들을 삭제하시겠습니까? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      log('❌ 작업이 취소되었습니다.', 'red');
      return;
    }

    // 고아 레코드 삭제
    const [result] = await connection.query(`
      DELETE uop FROM user_onboarding_preferences uop
      LEFT JOIN users u ON uop.userId = u.id
      WHERE u.id IS NULL
    `);

    log(`\n✅ ${result.affectedRows}개의 고아 레코드가 삭제되었습니다.`, 'green');

    // 정합성 재확인
    log('\n🔍 정합성 재확인 중...', 'cyan');
    const [remaining] = await connection.query(`
      SELECT COUNT(*) as count
      FROM user_onboarding_preferences uop
      LEFT JOIN users u ON uop.userId = u.id
      WHERE u.id IS NULL
    `);

    if (remaining[0].count === 0) {
      log('✅ 모든 고아 레코드가 정리되었습니다.', 'green');
    } else {
      log(`⚠️  아직 ${remaining[0].count}개의 고아 레코드가 남아있습니다.`, 'yellow');
    }

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

cleanupOrphanedData();
