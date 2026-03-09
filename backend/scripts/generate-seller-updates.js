#!/usr/bin/env node
/**
 * 원격 DB의 모든 sellers를 조회하여 UPDATE 문을 생성합니다.
 * 사용법: DATABASE_URL=... node backend/scripts/generate-seller-updates.js
 * 출력: ChaLog Lightsail Docker MySQL.session.sql (또는 지정 경로)
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const rootEnv = path.join(__dirname, '../../.env');
if (fs.existsSync(rootEnv)) require('dotenv').config({ path: rootEnv });
else require('dotenv').config();

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
      throw new Error(`Invalid DATABASE_URL: ${databaseUrl}`);
    }
  }
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'chalog',
  };
};

function escapeSql(str) {
  if (str == null || str === '') return null;
  return String(str).replace(/'/g, "''");
}

function toSqlValue(val) {
  if (val == null || val === '') return 'NULL';
  return `'${escapeSql(val)}'`;
}

async function main() {
  const dbConfig = parseDatabaseUrl();
  if (!dbConfig.password) {
    console.error('DATABASE_URL 또는 DB_PASSWORD가 필요합니다.');
    process.exit(1);
  }

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ DB 연결 성공');

    const [rows] = await connection.query(`
      SELECT id, name, address, mapUrl, websiteUrl, phone, description, businessHours, createdAt
      FROM sellers
      ORDER BY name
    `);

    if (rows.length === 0) {
      console.log('등록된 seller가 없습니다.');
      return;
    }

    const updates = rows.map((s) => {
      const addr = toSqlValue(s.address);
      const map = toSqlValue(s.mapUrl);
      const web = toSqlValue(s.websiteUrl);
      const ph = toSqlValue(s.phone);
      const desc = toSqlValue(s.description);
      const hours = toSqlValue(s.businessHours);

      return `UPDATE sellers 
SET 
    address = ${addr},
    mapUrl = ${map},
    websiteUrl = ${web},
    phone = ${ph},
    description = ${desc},
    businessHours = ${hours},
    createdAt = NOW(6)
WHERE 
    name = '${escapeSql(s.name)}';`;
    });

    const header = `-- 원격 DB sellers UPDATE 문 (자동 생성)
-- 생성: node backend/scripts/generate-seller-updates.js 또는 cd backend && npm run generate:seller-updates
-- 필요: DATABASE_URL 또는 DB_* 환경 변수
--
`;
    const sql = header + updates.join('\n\n');
    const outPath = path.join(__dirname, '../../ChaLog Lightsail Docker MySQL.session.sql');
    fs.writeFileSync(outPath, sql, 'utf8');
    console.log(`✅ ${rows.length}개 seller UPDATE 문 생성 완료: ${outPath}`);
  } catch (err) {
    console.error('오류:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

main();
