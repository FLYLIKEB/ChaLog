const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
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
  
  // DATABASE_URL이 없으면 개별 환경 변수 사용
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'chalog',
  };
};

const insertSampleData = async () => {
  let connection;
  
  try {
    // 데이터베이스 연결 설정 파싱
    const dbConfig = parseDatabaseUrl();
    
    if (!dbConfig.password) {
      throw new Error('Database password is required. Please set DATABASE_URL or DB_PASSWORD environment variable.');
    }
    
    // 데이터베이스 연결
    connection = await mysql.createConnection(dbConfig);

    console.log('✅ 데이터베이스 연결 성공\n');

    // 1. 사용자 데이터 추가
    console.log('📝 사용자 데이터 추가 중...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = [
      {
        email: 'tea@example.com',
        name: '김차인',
        password: hashedPassword,
      },
      {
        email: 'user2@example.com',
        name: '이다원',
        password: hashedPassword,
      },
      {
        email: 'user3@example.com',
        name: '박녹차',
        password: hashedPassword,
      },
    ];

    for (const user of users) {
      // users 테이블에 name만 삽입
      const [result] = await connection.query(
        'INSERT INTO users (name) VALUES (?)',
        [user.name]
      );
      const userId = result.insertId;
      
      // user_authentications 테이블에 인증 정보 삽입
      await connection.query(
        'INSERT INTO user_authentications (userId, provider, providerId, credential) VALUES (?, ?, ?, ?)',
        [userId, 'email', user.email, user.password]
      );
      
      console.log(`  ✅ 사용자 추가: ${user.name} (${user.email})`);
    }

    // 2. 찻집(sellers) 데이터 추가
    console.log('\n🏪 찻집 데이터 추가 중...');
    const sellerNames = ['차향', '찻잎', '티하우스'];
    const sellerIdMap = {};
    for (const name of sellerNames) {
      const [rows] = await connection.query('SELECT id FROM sellers WHERE name = ?', [name]);
      if (rows.length > 0) {
        sellerIdMap[name] = rows[0].id;
      } else {
        const [result] = await connection.query(
          'INSERT INTO sellers (name, createdAt) VALUES (?, NOW(6))',
          [name]
        );
        sellerIdMap[name] = result.insertId;
      }
      console.log(`  ✅ 찻집 추가: ${name}`);
    }

    // 3. 차 데이터 추가
    console.log('\n🍵 차 데이터 추가 중...');
    const teas = [
      { name: '정산소종', year: 2023, type: '홍차', seller: '차향', origin: '중국 푸젠', averageRating: 4.5, reviewCount: 2 },
      { name: '대홍포', year: 2022, type: '청차/우롱차', seller: '찻잎', origin: '중국 우이산', averageRating: 4.8, reviewCount: 1 },
      { name: '용정', year: 2024, type: '녹차', seller: '차향', origin: '중국 항저우', averageRating: 4.2, reviewCount: 1 },
      { name: '백호은침', year: 2023, type: '백차', seller: '티하우스', origin: '중국 푸젠', averageRating: 4.6, reviewCount: 1 },
      { name: '철관음', year: 2023, type: '청차/우롱차', seller: '찻잎', origin: '중국 안시', averageRating: 4.4, reviewCount: 0 },
    ];

    for (const tea of teas) {
      const sellerId = sellerIdMap[tea.seller] ?? null;
      await connection.query(
        'INSERT INTO teas (name, year, type, sellerId, origin, averageRating, reviewCount) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [tea.name, tea.year, tea.type, sellerId, tea.origin, tea.averageRating, tea.reviewCount]
      );
      console.log(`  ✅ 차 추가: ${tea.name} (${tea.type})`);
    }

    // 4. 노트 데이터 추가
    console.log('\n📝 노트 데이터 추가 중...');
    
    // 사용자와 차 ID 가져오기
    const [userRows] = await connection.query('SELECT id, name FROM users');
    const [teaRows] = await connection.query('SELECT id, name FROM teas');
    
    const userIdMap = {};
    const teaIdMap = {};
    userRows.forEach(u => userIdMap[u.name] = u.id);
    teaRows.forEach(t => teaIdMap[t.name] = t.id);

    const notes = [
      {
        teaName: '정산소종',
        userName: '김차인',
        rating: 4.5,
        ratings: {
          richness: 4,
          strength: 3,
          smoothness: 5,
          clarity: 4,
          complexity: 4,
        },
        memo: '은은한 훈향이 매력적입니다. 부드러운 목넘김과 긴 여운이 좋았어요.',
        isPublic: true,
      },
      {
        teaName: '대홍포',
        userName: '이다원',
        rating: 5.0,
        ratings: {
          richness: 5,
          strength: 4,
          smoothness: 4,
          clarity: 5,
          complexity: 5,
        },
        memo: '깊은 향과 복합적인 맛이 인상적입니다. 바위의 기운이 느껴지는 듯한 미네랄리티가 훌륭해요.',
        isPublic: true,
      },
      {
        teaName: '용정',
        userName: '박녹차',
        rating: 4.0,
        ratings: {
          richness: 3,
          strength: 2,
          smoothness: 5,
          clarity: 5,
          complexity: 3,
        },
        memo: '깨끗하고 상쾌한 맛. 봄의 신선함이 그대로 전해집니다.',
        isPublic: true,
      },
      {
        teaName: '정산소종',
        userName: '김차인',
        rating: 4.0,
        ratings: {
          richness: 4,
          strength: 3,
          smoothness: 4,
          clarity: 4,
          complexity: 3,
        },
        memo: '개인 기록용 메모입니다.',
        isPublic: false,
      },
      {
        teaName: '백호은침',
        userName: '김차인',
        rating: 4.8,
        ratings: {
          richness: 4,
          strength: 2,
          smoothness: 5,
          clarity: 5,
          complexity: 4,
        },
        memo: '섬세하고 우아한 맛. 은은한 꽃향기와 달콤함이 조화롭습니다.',
        isPublic: true,
      },
    ];

    for (const note of notes) {
      const teaId = teaIdMap[note.teaName];
      const userId = userIdMap[note.userName];
      
      if (!teaId || !userId) {
        console.log(`  ⚠️  스킵: ${note.teaName} 또는 ${note.userName}을 찾을 수 없습니다`);
        continue;
      }

      await connection.query(
        'INSERT INTO notes (teaId, userId, rating, ratings, memo, isPublic) VALUES (?, ?, ?, ?, ?, ?)',
        [
          teaId,
          userId,
          note.rating,
          JSON.stringify(note.ratings),
          note.memo,
          note.isPublic,
        ]
      );
      console.log(`  ✅ 노트 추가: ${note.teaName} by ${note.userName} (${note.isPublic ? '공개' : '비공개'})`);
    }

    // 데이터 확인
    console.log('\n📊 데이터 확인:');
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    const [teaCount] = await connection.query('SELECT COUNT(*) as count FROM teas');
    const [noteCount] = await connection.query('SELECT COUNT(*) as count FROM notes');
    
    console.log(`  - 사용자: ${userCount[0].count}명`);
    console.log(`  - 차: ${teaCount[0].count}개`);
    console.log(`  - 노트: ${noteCount[0].count}개`);

    console.log('\n🎉 샘플 데이터 추가 완료!');
    
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

insertSampleData();

