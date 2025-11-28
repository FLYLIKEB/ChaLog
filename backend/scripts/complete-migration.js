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
  
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'chalog',
  };
};

const completeMigration = async () => {
  let connection;
  
  try {
    const config = parseDatabaseUrl();
    console.log('🔄 마이그레이션 완료 작업 시작...');
    console.log(`📊 데이터베이스: ${config.database}@${config.host}:${config.port}`);
    
    connection = await mysql.createConnection({
      ...config,
      multipleStatements: true,
    });

    console.log('✅ 데이터베이스 연결 성공');
    await connection.beginTransaction();

    // 1. Users 테이블에 id 컬럼 추가 (없는 경우)
    console.log('📝 Users 테이블 확인 중...');
    const [userColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'",
      [config.database]
    );
    
    if (userColumns.length === 0) {
      console.log('  → id 컬럼 추가 중...');
      await connection.query('ALTER TABLE `users` ADD COLUMN `id` INT AUTO_INCREMENT PRIMARY KEY FIRST');
    } else {
      console.log('  → id 컬럼 이미 존재');
    }

    // 2. 외래키 제약조건 제거
    console.log('📝 외래키 제약조건 제거 중...');
    const [fks] = await connection.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' 
      AND CONSTRAINT_NAME != 'PRIMARY' 
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [config.database]);
    
    for (const fk of fks) {
      try {
        await connection.query(`ALTER TABLE \`notes\` DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``);
        console.log(`  → ${fk.CONSTRAINT_NAME} 제거 완료`);
      } catch (error) {
        console.log(`  ⚠️  ${fk.CONSTRAINT_NAME} 제거 실패 (이미 제거되었을 수 있음)`);
      }
    }

    // 3. Notes 테이블 정리
    console.log('📝 Notes 테이블 정리 중...');
    const [noteColumns] = await connection.query(
      "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes'",
      [config.database]
    );
    
    const hasOldTeaId = noteColumns.some(c => c.COLUMN_NAME === 'teaId' && c.DATA_TYPE === 'varchar');
    const hasNewTeaId = noteColumns.some(c => c.COLUMN_NAME === 'new_teaId');
    const hasOldUserId = noteColumns.some(c => c.COLUMN_NAME === 'userId' && c.DATA_TYPE === 'varchar');
    const hasNewUserId = noteColumns.some(c => c.COLUMN_NAME === 'new_userId');
    const hasIntTeaId = noteColumns.some(c => c.COLUMN_NAME === 'teaId' && c.DATA_TYPE === 'int');

    // 기존 varchar 컬럼 제거 (외래키 제약조건이 이미 제거되었으므로 안전)
    if (hasOldTeaId && !hasIntTeaId) {
      try {
        await connection.query('ALTER TABLE `notes` DROP COLUMN `teaId`');
        console.log('  → 기존 teaId(varchar) 제거');
      } catch (error) {
        console.log('  ⚠️  teaId 제거 실패:', error.message);
      }
    }
    
    if (hasOldUserId) {
      try {
        await connection.query('ALTER TABLE `notes` DROP COLUMN `userId`');
        console.log('  → 기존 userId(varchar) 제거');
      } catch (error) {
        console.log('  ⚠️  userId 제거 실패:', error.message);
      }
    }
    
    // new_teaId를 teaId로 변경 (기존 teaId가 없는 경우만)
    if (hasNewTeaId && !hasIntTeaId) {
      try {
        await connection.query('ALTER TABLE `notes` CHANGE COLUMN `new_teaId` `teaId` INT NOT NULL');
        console.log('  → new_teaId → teaId 변경');
      } catch (error) {
        console.log('  ⚠️  new_teaId 변경 실패:', error.message);
      }
    } else if (hasNewTeaId && hasIntTeaId) {
      // 둘 다 있으면 new_teaId 데이터를 teaId로 복사 후 new_teaId 제거
      try {
        await connection.query('UPDATE `notes` SET `teaId` = `new_teaId` WHERE `new_teaId` IS NOT NULL');
        await connection.query('ALTER TABLE `notes` DROP COLUMN `new_teaId`');
        console.log('  → new_teaId 데이터를 teaId로 복사 후 제거');
      } catch (error) {
        console.log('  ⚠️  new_teaId 처리 실패:', error.message);
      }
    }
    
    // new_userId를 userId로 변경
    if (hasNewUserId) {
      const hasIntUserId = noteColumns.some(c => c.COLUMN_NAME === 'userId' && c.DATA_TYPE === 'int');
      if (!hasIntUserId) {
        try {
          await connection.query('ALTER TABLE `notes` CHANGE COLUMN `new_userId` `userId` INT NOT NULL');
          console.log('  → new_userId → userId 변경');
        } catch (error) {
          console.log('  ⚠️  new_userId 변경 실패:', error.message);
        }
      } else {
        // 둘 다 있으면 new_userId 데이터를 userId로 복사 후 제거
        try {
          await connection.query('UPDATE `notes` SET `userId` = `new_userId` WHERE `new_userId` IS NOT NULL');
          await connection.query('ALTER TABLE `notes` DROP COLUMN `new_userId`');
          console.log('  → new_userId 데이터를 userId로 복사 후 제거');
        } catch (error) {
          console.log('  ⚠️  new_userId 처리 실패:', error.message);
        }
      }
    }

    // 4. Teas 테이블 정리
    console.log('📝 Teas 테이블 정리 중...');
    const [teaColumns] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'teas'",
      [config.database]
    );
    
    const hasNewId = teaColumns.some(c => c.COLUMN_NAME === 'new_id');
    const hasOldId = teaColumns.some(c => c.COLUMN_NAME === 'id' && teaColumns.find(col => col.COLUMN_NAME === 'id')?.DATA_TYPE === 'varchar');

    if (hasNewId) {
      await connection.query('ALTER TABLE `teas` DROP PRIMARY KEY');
      if (hasOldId) {
        await connection.query('ALTER TABLE `teas` DROP COLUMN `id`');
        console.log('  → 기존 id(varchar) 제거');
      }
      await connection.query('ALTER TABLE `teas` CHANGE COLUMN `new_id` `id` INT AUTO_INCREMENT PRIMARY KEY');
      console.log('  → new_id → id 변경');
    }

    // 5. 인덱스 재생성
    console.log('📝 인덱스 재생성 중...');
    try {
      await connection.query('CREATE INDEX `IDX_notes_teaId` ON `notes` (`teaId`)');
      console.log('  → IDX_notes_teaId 생성');
    } catch (error) {
      if (!error.message.includes('Duplicate')) {
        console.log('  ⚠️  IDX_notes_teaId 생성 실패:', error.message);
      }
    }
    
    try {
      await connection.query('CREATE INDEX `IDX_notes_userId` ON `notes` (`userId`)');
      console.log('  → IDX_notes_userId 생성');
    } catch (error) {
      if (!error.message.includes('Duplicate')) {
        console.log('  ⚠️  IDX_notes_userId 생성 실패:', error.message);
      }
    }

    // 6. 외래키 재생성
    console.log('📝 외래키 재생성 중...');
    try {
      await connection.query(`
        ALTER TABLE \`notes\` 
        ADD CONSTRAINT \`FK_notes_tea\` FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE
      `);
      console.log('  → FK_notes_tea 생성');
    } catch (error) {
      if (!error.message.includes('Duplicate')) {
        console.log('  ⚠️  FK_notes_tea 생성 실패:', error.message);
      }
    }
    
    try {
      await connection.query(`
        ALTER TABLE \`notes\` 
        ADD CONSTRAINT \`FK_notes_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      `);
      console.log('  → FK_notes_user 생성');
    } catch (error) {
      if (!error.message.includes('Duplicate')) {
        console.log('  ⚠️  FK_notes_user 생성 실패:', error.message);
      }
    }

    // 7. AUTO_INCREMENT 설정
    console.log('📝 AUTO_INCREMENT 설정 중...');
    const [userMax] = await connection.query('SELECT COALESCE(MAX(id), 0) as max_id FROM `users`');
    const [teaMax] = await connection.query('SELECT COALESCE(MAX(id), 0) as max_id FROM `teas`');
    const [noteMax] = await connection.query('SELECT COALESCE(MAX(id), 0) as max_id FROM `notes`');

    await connection.query(`ALTER TABLE \`users\` AUTO_INCREMENT = ${userMax[0].max_id + 1}`);
    await connection.query(`ALTER TABLE \`teas\` AUTO_INCREMENT = ${teaMax[0].max_id + 1}`);
    await connection.query(`ALTER TABLE \`notes\` AUTO_INCREMENT = ${noteMax[0].max_id + 1}`);
    console.log('  → AUTO_INCREMENT 설정 완료');

    await connection.commit();
    console.log('\n✅ 마이그레이션 완료!');

    // 결과 확인
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [teas] = await connection.query('SELECT COUNT(*) as count FROM teas');
    const [notes] = await connection.query('SELECT COUNT(*) as count FROM notes');

    console.log('\n📊 최종 결과:');
    console.log(`  Users: ${users[0].count}개`);
    console.log(`  Teas: ${teas[0].count}개`);
    console.log(`  Notes: ${notes[0].count}개`);

    // 테이블 구조 확인
    const [userStructure] = await connection.query('DESCRIBE users');
    const [teaStructure] = await connection.query('DESCRIBE teas');
    const [noteStructure] = await connection.query('DESCRIBE notes');

    console.log('\n📋 테이블 구조:');
    const userIdType = userStructure.find(c => c.Field === 'id')?.Type;
    const teaIdType = teaStructure.find(c => c.Field === 'id')?.Type;
    const noteIdType = noteStructure.find(c => c.Field === 'id')?.Type;
    console.log(`  Users.id: ${userIdType || '없음'}`);
    console.log(`  Teas.id: ${teaIdType || '없음'}`);
    console.log(`  Notes.id: ${noteIdType || '없음'}`);

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

if (require.main === module) {
  completeMigration().catch(error => {
    console.error('치명적 오류:', error);
    process.exit(1);
  });
}

module.exports = { completeMigration };

