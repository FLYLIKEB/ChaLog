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
  
  // 기본값: SSH 터널을 통한 연결 (localhost:3307)
  // create-tables.js와 동일한 연결 정보 사용
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'az980831',
    database: process.env.DB_NAME || 'chalog',
  };
};

const fixMigration = async () => {
  let connection;
  
  try {
    const config = parseDatabaseUrl();
    console.log('🔧 마이그레이션 수정 작업 시작...');
    console.log(`📊 데이터베이스: ${config.database}@${config.host}:${config.port}`);
    
    try {
      connection = await mysql.createConnection({
        ...config,
        multipleStatements: true,
      });
    } catch (connError) {
      console.error('❌ 연결 실패:', connError.message || connError.toString());
      console.error('에러 전체:', JSON.stringify(connError, Object.getOwnPropertyNames(connError)));
      console.error('연결 설정:', { ...config, password: '***' });
      throw connError;
    }

    console.log('✅ 데이터베이스 연결 성공');
    await connection.beginTransaction();

    // 1. 현재 상태 확인
    console.log('\n📋 현재 상태 확인...');
    const [noteColumns] = await connection.query(
      "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notes' ORDER BY COLUMN_NAME",
      [config.database]
    );
    const [teaColumns] = await connection.query(
      "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'teas' ORDER BY COLUMN_NAME",
      [config.database]
    );
    
    console.log('Notes 컬럼:', noteColumns.map(c => `${c.COLUMN_NAME}(${c.DATA_TYPE})`).join(', '));
    console.log('Teas 컬럼:', teaColumns.map(c => `${c.COLUMN_NAME}(${c.DATA_TYPE})`).join(', '));

    // 2. Notes 테이블 정리
    console.log('\n📝 Notes 테이블 정리 중...');
    
    const hasNewTeaId = noteColumns.some(c => c.COLUMN_NAME === 'new_teaId');
    const hasNewUserId = noteColumns.some(c => c.COLUMN_NAME === 'new_userId');
    const hasOldTeaId = noteColumns.some(c => c.COLUMN_NAME === 'teaId' && c.DATA_TYPE === 'varchar');
    const hasOldUserId = noteColumns.some(c => c.COLUMN_NAME === 'userId' && c.DATA_TYPE === 'varchar');
    const hasIntTeaId = noteColumns.some(c => c.COLUMN_NAME === 'teaId' && c.DATA_TYPE === 'int');
    const hasIntUserId = noteColumns.some(c => c.COLUMN_NAME === 'userId' && c.DATA_TYPE === 'int');

    // 외래키 제약조건 제거
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
        console.log(`  → 외래키 ${fk.CONSTRAINT_NAME} 제거`);
      } catch (error) {
        // 무시
      }
    }

    // 기존 varchar 컬럼 제거
    if (hasOldTeaId) {
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

    // new_teaId를 teaId로 변경
    if (hasNewTeaId && !hasIntTeaId) {
      try {
        // NULL 값 확인 및 처리
        const [nullCheck] = await connection.query('SELECT COUNT(*) as cnt FROM `notes` WHERE `new_teaId` IS NULL');
        if (nullCheck[0].cnt > 0) {
          console.log(`  ⚠️  ${nullCheck[0].cnt}개의 NULL 값 발견, 0으로 설정`);
          await connection.query('UPDATE `notes` SET `new_teaId` = 0 WHERE `new_teaId` IS NULL');
        }
        await connection.query('ALTER TABLE `notes` CHANGE COLUMN `new_teaId` `teaId` INT NOT NULL');
        console.log('  → new_teaId → teaId 변경 완료');
      } catch (error) {
        console.log('  ⚠️  new_teaId 변경 실패:', error.message);
        // 데이터 확인
        const [data] = await connection.query('SELECT id, new_teaId FROM `notes` WHERE new_teaId IS NULL OR new_teaId = 0 LIMIT 5');
        if (data.length > 0) {
          console.log('  문제 데이터:', data);
        }
      }
    }

    // new_userId를 userId로 변경
    if (hasNewUserId && !hasIntUserId) {
      try {
        // NULL 값 확인 및 처리
        const [nullCheck] = await connection.query('SELECT COUNT(*) as cnt FROM `notes` WHERE `new_userId` IS NULL');
        if (nullCheck[0].cnt > 0) {
          console.log(`  ⚠️  ${nullCheck[0].cnt}개의 NULL 값 발견, 0으로 설정`);
          await connection.query('UPDATE `notes` SET `new_userId` = 0 WHERE `new_userId` IS NULL');
        }
        await connection.query('ALTER TABLE `notes` CHANGE COLUMN `new_userId` `userId` INT NOT NULL');
        console.log('  → new_userId → userId 변경 완료');
      } catch (error) {
        console.log('  ⚠️  new_userId 변경 실패:', error.message);
      }
    }

    // 3. Teas 테이블 정리
    console.log('\n📝 Teas 테이블 정리 중...');
    const hasNewId = teaColumns.some(c => c.COLUMN_NAME === 'new_id');
    const hasOldId = teaColumns.some(c => c.COLUMN_NAME === 'id' && c.DATA_TYPE === 'varchar');
    const hasIntId = teaColumns.some(c => c.COLUMN_NAME === 'id' && c.DATA_TYPE === 'int');

    if (hasNewId && !hasIntId) {
      // PRIMARY KEY 확인
      const [pkInfo] = await connection.query(`
        SELECT CONSTRAINT_NAME 
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'teas' AND CONSTRAINT_TYPE = 'PRIMARY KEY'
      `, [config.database]);
      
      if (pkInfo.length > 0 && pkInfo[0].CONSTRAINT_NAME === 'PRIMARY') {
        // PRIMARY KEY가 new_id에 있으면 제거
        try {
          await connection.query('ALTER TABLE `teas` DROP PRIMARY KEY');
          console.log('  → PRIMARY KEY 제거');
        } catch (error) {
          console.log('  ⚠️  PRIMARY KEY 제거 실패:', error.message);
        }
      }
      
      if (hasOldId) {
        try {
          await connection.query('ALTER TABLE `teas` DROP COLUMN `id`');
          console.log('  → 기존 id(varchar) 제거');
        } catch (error) {
          console.log('  ⚠️  id 제거 실패:', error.message);
        }
      }
      
      try {
        await connection.query('ALTER TABLE `teas` CHANGE COLUMN `new_id` `id` INT AUTO_INCREMENT PRIMARY KEY');
        console.log('  → new_id → id 변경 완료');
      } catch (error) {
        console.log('  ⚠️  new_id 변경 실패:', error.message);
      }
    }

    // 4. 인덱스 재생성
    console.log('\n📝 인덱스 재생성 중...');
    try {
      await connection.query('CREATE INDEX IF NOT EXISTS `IDX_notes_teaId` ON `notes` (`teaId`)');
      console.log('  → IDX_notes_teaId 생성');
    } catch (error) {
      if (!error.message.includes('Duplicate')) {
        console.log('  ⚠️  IDX_notes_teaId:', error.message);
      }
    }
    
    try {
      await connection.query('CREATE INDEX IF NOT EXISTS `IDX_notes_userId` ON `notes` (`userId`)');
      console.log('  → IDX_notes_userId 생성');
    } catch (error) {
      if (!error.message.includes('Duplicate')) {
        console.log('  ⚠️  IDX_notes_userId:', error.message);
      }
    }

    // 5. 외래키 재생성
    console.log('\n📝 외래키 재생성 중...');
    try {
      await connection.query(`
        ALTER TABLE \`notes\` 
        ADD CONSTRAINT \`FK_notes_tea\` FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE
      `);
      console.log('  → FK_notes_tea 생성');
    } catch (error) {
      if (!error.message.includes('Duplicate')) {
        console.log('  ⚠️  FK_notes_tea:', error.message);
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
        console.log('  ⚠️  FK_notes_user:', error.message);
      }
    }

    // 6. AUTO_INCREMENT 설정
    console.log('\n📝 AUTO_INCREMENT 설정 중...');
    const [userMax] = await connection.query('SELECT COALESCE(MAX(id), 0) as max_id FROM `users`');
    const [teaMax] = await connection.query('SELECT COALESCE(MAX(id), 0) as max_id FROM `teas`');
    const [noteMax] = await connection.query('SELECT COALESCE(MAX(id), 0) as max_id FROM `notes`');

    await connection.query(`ALTER TABLE \`users\` AUTO_INCREMENT = ${userMax[0].max_id + 1}`);
    await connection.query(`ALTER TABLE \`teas\` AUTO_INCREMENT = ${teaMax[0].max_id + 1}`);
    await connection.query(`ALTER TABLE \`notes\` AUTO_INCREMENT = ${noteMax[0].max_id + 1}`);
    console.log('  → AUTO_INCREMENT 설정 완료');

    await connection.commit();
    console.log('\n✅ 마이그레이션 수정 완료!');

    // 최종 확인
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [teas] = await connection.query('SELECT COUNT(*) as count FROM teas');
    const [notes] = await connection.query('SELECT COUNT(*) as count FROM notes');

    console.log('\n📊 최종 결과:');
    console.log(`  Users: ${users[0].count}개`);
    console.log(`  Teas: ${teas[0].count}개`);
    console.log(`  Notes: ${notes[0].count}개`);

    // 테이블 구조 최종 확인
    const [userStructure] = await connection.query('DESCRIBE users');
    const [teaStructure] = await connection.query('DESCRIBE teas');
    const [noteStructure] = await connection.query('DESCRIBE notes');

    console.log('\n📋 최종 테이블 구조:');
    const userIdType = userStructure.find(c => c.Field === 'id')?.Type;
    const teaIdType = teaStructure.find(c => c.Field === 'id')?.Type;
    const noteIdType = noteStructure.find(c => c.Field === 'id')?.Type;
    const noteTeaIdType = noteStructure.find(c => c.Field === 'teaId')?.Type;
    const noteUserIdType = noteStructure.find(c => c.Field === 'userId')?.Type;
    
    console.log(`  Users.id: ${userIdType || '없음'}`);
    console.log(`  Teas.id: ${teaIdType || '없음'}`);
    console.log(`  Notes.id: ${noteIdType || '없음'}`);
    console.log(`  Notes.teaId: ${noteTeaIdType || '없음'}`);
    console.log(`  Notes.userId: ${noteUserIdType || '없음'}`);

  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.error('❌ 오류 발생! 롤백 완료');
    }
    console.error('❌ 마이그레이션 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

if (require.main === module) {
  fixMigration().catch(error => {
    console.error('치명적 오류:', error);
    process.exit(1);
  });
}

module.exports = { fixMigration };

