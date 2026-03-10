const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'chalog',
  };
};

(async () => {
  let connection;
  try {
    const config = parseDatabaseUrl();
    connection = await mysql.createConnection(config);
    console.log('✅ 데이터베이스 연결 성공');

    // 컬럼 존재 여부 확인
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' AND COLUMN_NAME = 'appearance'`,
      [config.database]
    );

    if (columns.length > 0) {
      console.log('ℹ️  appearance 컬럼이 이미 존재합니다. 스킵합니다.');
    } else {
      await connection.query(
        `ALTER TABLE notes ADD COLUMN appearance VARCHAR(50) NULL AFTER isRatingIncluded`
      );
      console.log('✅ notes 테이블에 appearance 컬럼 추가 완료');
    }
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
})();
