/**
 * CSV 테이스팅 노트 데이터를 로컬 teas/sellers 테이블에 삽입하는 스크립트
 *
 * 사용법:
 *   node backend/scripts/seed-teas-from-csv.js
 *
 * 전제조건:
 *   - SSH 터널 또는 로컬 DB가 실행 중이어야 합니다
 *   - backend/.env 또는 루트 .env 에 DATABASE_URL (또는 DB_* 환경변수) 설정
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ─── DB 연결 설정 ────────────────────────────────────────────────────────────

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
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3307', 10),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'chalog',
  };
};

// ─── CSV 파싱 ─────────────────────────────────────────────────────────────────

function parseCSV(content) {
  const lines = content.split('\n');

  // BOM 제거 후 헤더 파싱
  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = parseCSVLine(headerLine);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ─── 데이터 변환 ──────────────────────────────────────────────────────────────

function transformRows(rows) {
  const sellers = new Set();
  const teas = [];

  for (const r of rows) {
    const nameRaw = r['이름'] || '';
    const sellerName = r['제조사'] || '';
    const teaType = r['종류'] || '';
    const priceRaw = r['가격'] || '';

    if (!nameRaw || !teaType) continue;

    // 앞 숫자/? 접두사 제거 → 차 이름
    const name = nameRaw.replace(/^[\d?]+\s+/, '').trim();

    // 2자리 연도 추출 (예: "24 여산운무" → 2024)
    const yearMatch = nameRaw.match(/^(\d{2})\s+/);
    const year = yearMatch ? 2000 + parseInt(yearMatch[1], 10) : null;

    // 가격 파싱 (₩400,000 → 400000)
    let price = null;
    if (priceRaw) {
      const priceClean = priceRaw.replace(/[₩,\s]/g, '');
      const parsed = parseInt(priceClean, 10);
      if (!isNaN(parsed)) price = parsed;
    }

    if (sellerName) sellers.add(sellerName);

    teas.push({
      name,
      year,
      type: teaType,
      seller: sellerName || null,
      price,
    });
  }

  return { sellers: [...sellers].sort(), teas };
}

// ─── DB 삽입 ──────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = path.join(
    __dirname,
    '../../차 테이스팅 노트 28d373699e6680c98cd6e05aad81e7d0_all.csv',
  );

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV 파일을 찾을 수 없습니다: ${csvPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(content);
  const { sellers, teas } = transformRows(rows);

  console.log(`\n파싱 완료: sellers ${sellers.length}개, teas ${teas.length}개\n`);

  const dbConfig = parseDatabaseUrl();
  console.log(`DB 연결: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const connection = await mysql.createConnection(dbConfig);

  try {
    // 1. Sellers 삽입 (중복 무시)
    console.log('\n[1/2] Sellers 삽입...');
    for (const sellerName of sellers) {
      await connection.execute(
        'INSERT IGNORE INTO sellers (name, createdAt) VALUES (?, NOW(6))',
        [sellerName],
      );
      console.log(`  ✓ seller: ${sellerName}`);
    }

    // sellerId 조회용 맵 생성
    const [sellerRows] = await connection.execute('SELECT id, name FROM sellers');
    const sellerMap = {};
    for (const row of sellerRows) {
      sellerMap[row.name] = row.id;
    }

    // 2. Teas 삽입 (중복 무시: name + type 기준)
    console.log('\n[2/2] Teas 삽입...');
    let inserted = 0;
    let skipped = 0;

    for (const tea of teas) {
      const sellerId = tea.seller ? (sellerMap[tea.seller] ?? null) : null;

      const [existing] = await connection.execute(
        'SELECT id FROM teas WHERE name = ? AND type = ?',
        [tea.name, tea.type],
      );

      if (existing.length > 0) {
        console.log(`  - 이미 존재 (스킵): ${tea.name} (${tea.type})`);
        skipped++;
        continue;
      }

      await connection.execute(
        `INSERT INTO teas (name, year, type, sellerId, price, averageRating, reviewCount, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 0, 0, NOW(), NOW())`,
        [tea.name, tea.year ?? null, tea.type, sellerId, tea.price ?? null],
      );

      console.log(`  ✓ ${tea.name} (${tea.type}, ${tea.year ?? '-'}, ${tea.price ? `₩${tea.price.toLocaleString()}` : '-'})`);
      inserted++;
    }

    console.log(`\n완료: ${inserted}개 삽입, ${skipped}개 스킵\n`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('오류 발생:', err.message);
  process.exit(1);
});
