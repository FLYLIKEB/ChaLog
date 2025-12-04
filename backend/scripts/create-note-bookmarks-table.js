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

const createNoteBookmarksTable = async () => {
  let connection;
  
  try {
    const config = parseDatabaseUrl();
    config.multipleStatements = true;
    
    // 데이터베이스 연결
    connection = await mysql.createConnection(config);

    console.log('✅ 데이터베이스 연결 성공');

    // Note Bookmarks 테이블 생성
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`note_bookmarks\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`noteId\` INT NOT NULL,
        \`userId\` INT NOT NULL,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY \`unique_note_user_bookmark\` (\`noteId\`, \`userId\`),
        INDEX \`IDX_note_bookmarks_noteId\` (\`noteId\`),
        INDEX \`IDX_note_bookmarks_userId\` (\`userId\`),
        FOREIGN KEY (\`noteId\`) REFERENCES \`notes\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ note_bookmarks 테이블 생성 완료');

    console.log('\n🎉 북마크 테이블 생성 완료!');
    
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

createNoteBookmarksTable();

