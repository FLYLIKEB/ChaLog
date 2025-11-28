const mysql = require('mysql2/promise');
require('dotenv').config();

const parseDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl);
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
  
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
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

const changeDatetimePrecision = async () => {
  let connection;
  
  try {
    const config = parseDatabaseUrl();
    console.log('🔄 DATETIME precision 변경 시작...');
    console.log(`📊 데이터베이스: ${config.database}@${config.host}:${config.port}`);
    
    connection = await mysql.createConnection({
      ...config,
      multipleStatements: true,
    });

    console.log('✅ 데이터베이스 연결 성공');
    await connection.beginTransaction();

    // 현재 상태 확인
    console.log('\n📋 현재 상태 확인...');
    const tables = ['users', 'teas', 'notes'];
    for (const table of tables) {
      const [cols] = await connection.query(
        "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME IN ('createdAt', 'updatedAt')",
        [config.database, table]
      );
      cols.forEach(col => {
        console.log(`  ${table}.${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
      });
    }

    // Users 테이블 변경
    console.log('\n📝 Users 테이블 변경 중...');
    await connection.query(`
      ALTER TABLE \`users\` 
        MODIFY COLUMN \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MODIFY COLUMN \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
    console.log('  → 변경 완료');

    // Teas 테이블 변경
    console.log('📝 Teas 테이블 변경 중...');
    await connection.query(`
      ALTER TABLE \`teas\` 
        MODIFY COLUMN \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MODIFY COLUMN \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
    console.log('  → 변경 완료');

    // Notes 테이블 변경
    console.log('📝 Notes 테이블 변경 중...');
    await connection.query(`
      ALTER TABLE \`notes\` 
        MODIFY COLUMN \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MODIFY COLUMN \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
    console.log('  → 변경 완료');

    await connection.commit();
    console.log('\n✅ DATETIME precision 변경 완료!');

    // 변경 후 확인
    console.log('\n📋 변경 후 상태:');
    for (const table of tables) {
      const [cols] = await connection.query(
        "SELECT COLUMN_NAME, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME IN ('createdAt', 'updatedAt')",
        [config.database, table]
      );
      cols.forEach(col => {
        console.log(`  ${table}.${col.COLUMN_NAME}: ${col.COLUMN_TYPE}`);
      });
    }

  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.error('❌ 오류 발생! 롤백 완료');
    }
    console.error('❌ 변경 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

if (require.main === module) {
  changeDatetimePrecision().catch(error => {
    console.error('치명적 오류:', error);
    process.exit(1);
  });
}

module.exports = { changeDatetimePrecision };

