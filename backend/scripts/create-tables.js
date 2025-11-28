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
    // 무시
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
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chalog',
  };
};

const createTables = async () => {
  let connection;
  
  try {
    const config = parseDatabaseUrl();
    config.multipleStatements = true;
    
    // 데이터베이스 연결
    connection = await mysql.createConnection(config);

    console.log('✅ 데이터베이스 연결 성공');

    // Users 테이블 생성
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`email\` VARCHAR(255) NOT NULL UNIQUE,
        \`name\` VARCHAR(255) NOT NULL,
        \`password\` VARCHAR(255) NOT NULL,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`IDX_users_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ users 테이블 생성 완료');

    // Teas 테이블 생성
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`teas\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`year\` INT NULL,
        \`type\` VARCHAR(255) NOT NULL,
        \`seller\` VARCHAR(255) NULL,
        \`origin\` VARCHAR(255) NULL,
        \`averageRating\` DECIMAL(3,2) NOT NULL DEFAULT 0.00,
        \`reviewCount\` INT NOT NULL DEFAULT 0,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`IDX_teas_name\` (\`name\`),
        INDEX \`IDX_teas_type\` (\`type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ teas 테이블 생성 완료');

    // Notes 테이블 생성
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`notes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`teaId\` INT NOT NULL,
        \`userId\` INT NOT NULL,
        \`rating\` DECIMAL(3,2) NOT NULL,
        \`ratings\` JSON NOT NULL,
        \`memo\` TEXT NOT NULL,
        \`isPublic\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX \`IDX_notes_teaId\` (\`teaId\`),
        INDEX \`IDX_notes_userId\` (\`userId\`),
        INDEX \`IDX_notes_isPublic\` (\`isPublic\`),
        INDEX \`IDX_notes_createdAt\` (\`createdAt\`),
        FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ notes 테이블 생성 완료');

    // 테이블 목록 확인
    const [tables] = await connection.query('SHOW TABLES');
    console.log('\n📊 생성된 테이블 목록:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });

    console.log('\n🎉 모든 테이블 생성 완료!');
    
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

createTables();

