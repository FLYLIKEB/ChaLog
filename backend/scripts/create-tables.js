const mysql = require('mysql2/promise');

const createTables = async () => {
  let connection;
  
  try {
    // 데이터베이스 연결
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'admin',
      password: 'az980831',
      database: 'chalog',
      multipleStatements: true,
    });

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

