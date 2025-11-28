const mysql = require('mysql2/promise');

const fixForeignKeys = async () => {
  let connection;
  
  try {
    const config = {
      host: 'localhost',
      port: 3307,
      user: 'admin',
      password: 'az980831',
      database: 'chalog',
      multipleStatements: true,
    };
    
    console.log('🔧 외래키 제약조건 수정 중...');
    connection = await mysql.createConnection(config);
    await connection.beginTransaction();

    // 1. 유효하지 않은 참조 확인
    const [invalidTea] = await connection.query(`
      SELECT COUNT(*) as cnt FROM notes 
      WHERE teaId NOT IN (SELECT id FROM teas) OR teaId = 0
    `);
    const [invalidUser] = await connection.query(`
      SELECT COUNT(*) as cnt FROM notes 
      WHERE userId NOT IN (SELECT id FROM users) OR userId = 0
    `);

    console.log(`유효하지 않은 teaId: ${invalidTea[0].cnt}개`);
    console.log(`유효하지 않은 userId: ${invalidUser[0].cnt}개`);

    // 2. 유효하지 않은 노트 삭제 또는 수정
    if (invalidTea[0].cnt > 0) {
      console.log('유효하지 않은 teaId를 가진 노트 삭제 중...');
      await connection.query(`
        DELETE FROM notes 
        WHERE teaId NOT IN (SELECT id FROM teas) OR teaId = 0
      `);
      console.log(`  → ${invalidTea[0].cnt}개 노트 삭제`);
    }

    if (invalidUser[0].cnt > 0) {
      console.log('유효하지 않은 userId를 가진 노트 삭제 중...');
      await connection.query(`
        DELETE FROM notes 
        WHERE userId NOT IN (SELECT id FROM users) OR userId = 0
      `);
      console.log(`  → ${invalidUser[0].cnt}개 노트 삭제`);
    }

    // 3. 외래키 재생성
    console.log('외래키 제약조건 생성 중...');
    try {
      await connection.query(`
        ALTER TABLE \`notes\` 
        ADD CONSTRAINT \`FK_notes_tea\` FOREIGN KEY (\`teaId\`) REFERENCES \`teas\`(\`id\`) ON DELETE CASCADE
      `);
      console.log('  → FK_notes_tea 생성 완료');
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        console.log('  → FK_notes_tea 이미 존재');
      } else {
        throw error;
      }
    }
    
    try {
      await connection.query(`
        ALTER TABLE \`notes\` 
        ADD CONSTRAINT \`FK_notes_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
      `);
      console.log('  → FK_notes_user 생성 완료');
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        console.log('  → FK_notes_user 이미 존재');
      } else {
        throw error;
      }
    }

    await connection.commit();
    console.log('\n✅ 외래키 제약조건 수정 완료!');

    // 최종 확인
    const [notes] = await connection.query('SELECT COUNT(*) as count FROM notes');
    console.log(`\n📊 최종 Notes 개수: ${notes[0].count}개`);

  } catch (error) {
    if (connection) {
      await connection.rollback();
      console.error('❌ 오류 발생! 롤백 완료');
    }
    console.error('❌ 실패:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

if (require.main === module) {
  fixForeignKeys().catch(error => {
    console.error('치명적 오류:', error);
    process.exit(1);
  });
}

module.exports = { fixForeignKeys };

