const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// .env 파일 로드
const loadEnv = () => {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value.trim();
            }
          }
        }
      });
    }
  } catch (error) {
    console.warn('Failed to load .env:', error.message || error);
  }
};

const parseDatabaseUrl = () => {
  loadEnv();
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl.replace(/^mysql:\/\//, 'http://'));
      return {
        host: url.hostname,
        port: parseInt(url.port) || 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: url.pathname.replace(/^\//, ''),
      };
    } catch (error) {
      console.warn('DATABASE_URL 파싱 실패, 기본값 사용');
    }
  }
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'admin',
    database: process.env.DB_NAME || 'chalog',
  };
  
  const password = process.env.DB_PASSWORD;
  if (!password) {
    throw new Error('DB_PASSWORD environment variable is required. Please set DATABASE_URL or DB_PASSWORD.');
  }
  
  return {
    ...dbConfig,
    password,
  };
};

const deleteTestNotes = async () => {
  let connection;
  
  try {
    const config = parseDatabaseUrl();
    config.multipleStatements = true;
    
    // 데이터베이스 연결
    connection = await mysql.createConnection(config);

    console.log('✅ 데이터베이스 연결 성공\n');

    // 메모에 "테스트"가 포함된 노트 찾기
    console.log('🔍 테스트 노트 검색 중... (메모에 "테스트" 포함)');
    
    // 삭제 전 노트 개수 확인
    const [beforeCount] = await connection.query(
      `SELECT COUNT(*) as count FROM notes WHERE memo LIKE ?`,
      ['%테스트%']
    );
    const noteCountBefore = beforeCount[0].count;
    
    console.log(`📊 삭제 전 노트 개수: ${noteCountBefore}개`);
    
    if (noteCountBefore === 0) {
      console.log('⚠️  삭제할 테스트 노트가 없습니다.');
      return;
    }
    
    // 삭제할 노트 목록 확인
    const [notesToDelete] = await connection.query(
      `SELECT n.id, n.memo, u.name as userName, t.name as teaName, n.createdAt
       FROM notes n 
       JOIN users u ON n.userId = u.id 
       JOIN teas t ON n.teaId = t.id 
       WHERE n.memo LIKE ?
       ORDER BY n.createdAt DESC`,
      ['%테스트%']
    );
    
    console.log('\n🗑️  삭제할 노트 목록:');
    notesToDelete.forEach(note => {
      const memoPreview = note.memo ? (note.memo.length > 50 ? note.memo.substring(0, 50) + '...' : note.memo) : '(메모 없음)';
      console.log(`  - [ID: ${note.id}] ${note.teaName} by ${note.userName}`);
      console.log(`    메모: ${memoPreview}`);
    });
    
    // 노트 삭제 (CASCADE로 관련 데이터도 자동 삭제됨)
    console.log('\n🗑️  노트 삭제 중...');
    const [deleteResult] = await connection.query(
      `DELETE FROM notes WHERE memo LIKE ?`,
      ['%테스트%']
    );
    
    const deletedCount = deleteResult.affectedRows;
    console.log(`✅ ${deletedCount}개의 노트가 삭제되었습니다.`);
    
    // 삭제 후 확인
    const [afterCount] = await connection.query(
      `SELECT COUNT(*) as count FROM notes WHERE memo LIKE ?`,
      ['%테스트%']
    );
    const noteCountAfter = afterCount[0].count;
    
    console.log(`\n📊 삭제 후 노트 개수: ${noteCountAfter}개`);
    console.log('\n🎉 테스트 노트 삭제 완료!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

deleteTestNotes();

