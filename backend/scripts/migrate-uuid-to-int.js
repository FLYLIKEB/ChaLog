const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

/**
 * UUID에서 INT AUTO_INCREMENT로 마이그레이션하는 스크립트
 * 
 * 사용법:
 *   node scripts/migrate-uuid-to-int.js
 * 
 * 환경변수:
 *   DATABASE_URL: mysql://user:password@host:port/database
 *   또는 개별 설정:
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */

// .env 파일 로드 (dotenv 사용)
const loadEnv = () => {
  try {
    const fs = require('fs');
    const path = require('path');
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
    // .env 파일이 없어도 계속 진행
  }
};

const parseDatabaseUrl = () => {
  // .env 파일 로드
  loadEnv();
  
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
      if (url.protocol !== 'mysql:') {
        throw new Error(`Invalid protocol: ${url.protocol}`);
      }
      
      return {
        host: url.hostname,
        port: url.port ? parseInt(url.port, 10) : 3306,
        user: url.username,
        password: url.password || undefined,
        database: url.pathname.slice(1),
      };
    } catch (error) {
      throw new Error(`Invalid DATABASE_URL: ${error.message}`);
    }
  }
  
  // 개별 환경변수 사용
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10), // SSH 터널 기본 포트
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chalog',
  };
};

const migrate = async () => {
  let connection;
  
  try {
    const config = parseDatabaseUrl();
    
    console.log('🔄 UUID → INT 마이그레이션 시작...');
    console.log(`📊 데이터베이스: ${config.database}@${config.host}:${config.port}`);
    
    // 데이터베이스 연결
    connection = await mysql.createConnection({
      ...config,
      multipleStatements: true,
    });

    console.log('✅ 데이터베이스 연결 성공');

    // 트랜잭션 시작
    await connection.beginTransaction();
    console.log('📝 트랜잭션 시작');

    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, 'migrate-uuid-to-int.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // SQL 실행 (여러 문장)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📋 ${statements.length}개의 SQL 문장 실행 중...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        // SET @ 변수는 별도로 처리
        if (statement.includes('SET @')) {
          await connection.query(statement);
        } else if (statement.includes('PREPARE') || statement.includes('EXECUTE') || statement.includes('DEALLOCATE')) {
          await connection.query(statement);
        } else {
          await connection.query(statement);
        }
        
        // 진행 상황 표시
        if ((i + 1) % 5 === 0) {
          console.log(`  진행 중... ${i + 1}/${statements.length}`);
        }
      } catch (error) {
        // 일부 명령은 실패할 수 있음 (IF EXISTS 등)
        if (!error.message.includes('doesn\'t exist') && 
            !error.message.includes('Unknown') &&
            !statement.includes('DROP FOREIGN KEY IF EXISTS')) {
          console.warn(`⚠️  경고: ${error.message}`);
        }
      }
    }

    // 트랜잭션 커밋
    await connection.commit();
    console.log('✅ 트랜잭션 커밋 완료');
    console.log('🎉 마이그레이션 완료!');

    // 결과 확인
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [teas] = await connection.query('SELECT COUNT(*) as count FROM teas');
    const [notes] = await connection.query('SELECT COUNT(*) as count FROM notes');

    console.log('\n📊 마이그레이션 결과:');
    console.log(`  Users: ${users[0].count}개`);
    console.log(`  Teas: ${teas[0].count}개`);
    console.log(`  Notes: ${notes[0].count}개`);

    // 테이블 구조 확인
    const [userStructure] = await connection.query('DESCRIBE users');
    const [teaStructure] = await connection.query('DESCRIBE teas');
    const [noteStructure] = await connection.query('DESCRIBE notes');

    console.log('\n📋 테이블 구조 확인:');
    console.log('  Users ID 타입:', userStructure.find(c => c.Field === 'id')?.Type);
    console.log('  Teas ID 타입:', teaStructure.find(c => c.Field === 'id')?.Type);
    console.log('  Notes ID 타입:', noteStructure.find(c => c.Field === 'id')?.Type);

  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.error('❌ 오류 발생! 롤백 완료');
    }
    console.error('❌ 마이그레이션 실패:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

// 실행
if (require.main === module) {
  migrate().catch(error => {
    console.error('치명적 오류:', error);
    process.exit(1);
  });
}

module.exports = { migrate };

