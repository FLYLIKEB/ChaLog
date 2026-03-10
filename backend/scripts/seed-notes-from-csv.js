/**
 * CSV 테이스팅 노트 데이터를 user 1의 notes로 삽입하는 스크립트
 *
 * 사용법:
 *   DATABASE_URL=mysql://chalog_user:...@127.0.0.1:3307/chalog node backend/scripts/seed-notes-from-csv.js
 *
 * 스키마 매핑:
 *   스키마2 (CUSTOM): 두터움(BODY), 밀도(DENSITY), 매끄러움(SMOOTHNESS), 맑음(CLARITY), 다채로움(COMPLEXITY)
 *   스키마3 (TASTING_NOTE_V1): 섬세함(DELICACY), 순정함(PURITY), 향의 길이(FINISH), 향탕일체(HARMONY), 개인점수(OVERALL)
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const USER_ID = 1;

const parseDatabaseUrl = () => {
  const url = process.env.DATABASE_URL;
  if (url) {
    try {
      const u = new URL(url);
      return { host: u.hostname, port: u.port ? parseInt(u.port) : 3306, user: u.username, password: u.password || undefined, database: u.pathname.slice(1) };
    } catch (e) { throw new Error(`Invalid DATABASE_URL: ${e.message}`); }
  }
  return { host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '3307'), user: process.env.DB_USER || 'chalog_user', password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'chalog' };
};

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

function parseCSV(content) {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0].replace(/^\uFEFF/, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
    rows.push(row);
  }
  return rows;
}

function parseFloat_(v) {
  if (!v) return null;
  const n = parseFloat(v);
  if (isNaN(n) || n < 1 || n > 10) return null; // 범위 벗어난 값 무시
  return n;
}

async function main() {
  const csvPath = path.join(__dirname, '../../차 테이스팅 노트 28d373699e6680c98cd6e05aad81e7d0_all.csv');
  if (!fs.existsSync(csvPath)) { console.error('CSV 파일을 찾을 수 없습니다:', csvPath); process.exit(1); }

  const rows = parseCSV(fs.readFileSync(csvPath, 'utf-8'));

  const dbConfig = parseDatabaseUrl();
  console.log(`DB 연결: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}\n`);
  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: true });

  try {
    // teas 목록 로드 (name+type → id 매핑)
    const [teaRows] = await conn.execute('SELECT id, name, type FROM teas');
    const teaMap = {};
    for (const t of teaRows) {
      teaMap[`${t.name}__${t.type}`] = t.id;
      teaMap[t.name] = t.id; // fallback
    }

    // axis id 로드
    const [axisRows] = await conn.execute('SELECT id, schemaId, code FROM rating_axis');
    const axisMap = {}; // schemaId__code → id
    for (const a of axisRows) axisMap[`${a.schemaId}__${a.code}`] = a.id;

    // 종류 → DB type 매핑
    const typeMap = { '녹차': '녹차', '청차': '청차', '백차': '백차', '홍차': '홍차', '흑차': '흑차', '대용': '대용' };

    let inserted = 0, skipped = 0;

    for (const r of rows) {
      const nameRaw = r['이름'] || '';
      const teaType = r['종류'] || '';
      if (!nameRaw || !teaType) continue;

      const name = nameRaw.replace(/^[\d?]+\s+/, '').trim().replace(/혜원갱/g, '해원갱');
      const memo = r['특징 요약'].trim() || null;

      // tea 매핑: name+type 우선, fallback name만
      const teaId = teaMap[`${name}__${teaType}`] ?? teaMap[name] ?? null;
      if (!teaId) {
        console.log(`  - tea 없음 (스킵): ${name} (${teaType})`);
        skipped++;
        continue;
      }

      // 이미 해당 teaId+userId note 존재하면 스킵
      const [existing] = await conn.execute('SELECT id FROM notes WHERE userId = ? AND teaId = ?', [USER_ID, teaId]);
      if (existing.length > 0) {
        console.log(`  - 이미 존재 (스킵): ${name}`);
        skipped++;
        continue;
      }

      // 스키마2 axis 값
      const s2Values = {
        BODY:       parseFloat_(r['두터움']),
        DENSITY:    parseFloat_(r['밀도']),
        SMOOTHNESS: parseFloat_(r['매끄러움']),
        CLARITY:    parseFloat_(r['맑음']),
        COMPLEXITY: parseFloat_(r['다채로움']),
      };
      // 스키마3 axis 값
      const s3Values = {
        DELICACY: parseFloat_(r['섬세함']),
        PURITY:   parseFloat_(r['순정함']),
        FINISH:   parseFloat_(r['향의 길이']),
        HARMONY:  parseFloat_(r['향탕일체']),
        OVERALL:  parseFloat_(r['개인점수']),
      };

      const hasS2 = Object.values(s2Values).some(v => v !== null);
      const hasS3 = Object.values(s3Values).some(v => v !== null);

      // schemaId 결정: s2 값이 있으면 2, s3 값이 있으면 3, 둘 다 없으면 3(기본)
      const schemaId = hasS2 ? 2 : 3;

      // overallRating: 개인점수 있으면 사용, 없으면 axis 평균
      let overallRating = parseFloat_(r['개인점수']);
      if (overallRating === null && hasS2) {
        const vals = Object.values(s2Values).filter(v => v !== null);
        if (vals.length) overallRating = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
      }

      // note 삽입
      const [noteResult] = await conn.execute(
        'INSERT INTO notes (teaId, userId, memo, isPublic, schemaId, overallRating, isRatingIncluded, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?, 1, NOW(), NOW())',
        [teaId, USER_ID, memo, schemaId, overallRating]
      );
      const noteId = noteResult.insertId;

      // axis 값 삽입
      const axisEntries = schemaId === 2
        ? Object.entries(s2Values)
        : Object.entries(s3Values);

      for (const [code, val] of axisEntries) {
        if (val === null) continue;
        const axisId = axisMap[`${schemaId}__${code}`];
        if (!axisId) continue;
        await conn.execute(
          'INSERT INTO note_axis_value (noteId, axisId, valueNumeric, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
          [noteId, axisId, val]
        );
      }

      console.log(`  ✓ ${name} (schema${schemaId}, rating=${overallRating ?? '-'}, axes=${axisEntries.filter(([, v]) => v !== null).length}개)`);
      inserted++;
    }

    console.log(`\n완료: ${inserted}개 삽입, ${skipped}개 스킵\n`);
  } finally {
    await conn.end();
  }
}

main().catch(e => { console.error('오류:', e.message); process.exit(1); });
