# UUID → INT 마이그레이션 가이드

이 가이드는 기존 UUID 기반 데이터베이스를 INT AUTO_INCREMENT로 마이그레이션하는 방법을 설명합니다.

## ⚠️ 중요 사항

1. **반드시 백업을 먼저 수행하세요!**
   ```bash
   mysqldump -h HOST -P PORT -u USER -p DATABASE > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **마이그레이션 중에는 애플리케이션을 중지하세요**

3. **프로덕션 환경에서는 충분한 테스트를 거친 후 실행하세요**

## 마이그레이션 전 확인사항

### 1. 현재 데이터베이스 상태 확인

```sql
-- 테이블 구조 확인
DESCRIBE users;
DESCRIBE teas;
DESCRIBE notes;

-- 데이터 개수 확인
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM teas;
SELECT COUNT(*) FROM notes;

-- 외래키 확인
SELECT 
  CONSTRAINT_NAME, 
  TABLE_NAME, 
  COLUMN_NAME, 
  REFERENCED_TABLE_NAME, 
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### 2. 데이터 무결성 확인

```sql
-- 고아 노트 확인 (참조하는 차나 사용자가 없는 노트)
SELECT COUNT(*) FROM notes n
LEFT JOIN teas t ON n.teaId = t.id
LEFT JOIN users u ON n.userId = u.id
WHERE t.id IS NULL OR u.id IS NULL;
```

## 마이그레이션 실행

### 방법 1: 쉘 스크립트 사용 (권장)

```bash
cd backend
./scripts/migrate-uuid-to-int.sh
```

### 방법 2: Node.js 스크립트 직접 실행

```bash
cd backend
node scripts/migrate-uuid-to-int.js
```

환경 변수 설정:
```bash
export DATABASE_URL="mysql://user:password@host:port/database"
# 또는
export DB_HOST=localhost
export DB_PORT=3306
export DB_USER=root
export DB_PASSWORD=password
export DB_NAME=chalog
```

### 방법 3: SQL 파일 직접 실행

```bash
mysql -h HOST -P PORT -u USER -p DATABASE < backend/scripts/migrate-uuid-to-int.sql
```

## 마이그레이션 후 확인

### 1. 테이블 구조 확인

```sql
-- ID 타입이 INT인지 확인
DESCRIBE users;
DESCRIBE teas;
DESCRIBE notes;
```

### 2. 데이터 개수 확인

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM teas;
SELECT COUNT(*) FROM notes;
```

### 3. 외래키 관계 확인

```sql
-- 외래키가 제대로 설정되었는지 확인
SELECT 
  CONSTRAINT_NAME, 
  TABLE_NAME, 
  COLUMN_NAME, 
  REFERENCED_TABLE_NAME, 
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### 4. 샘플 데이터 확인

```sql
-- 첫 번째 사용자 확인
SELECT * FROM users LIMIT 1;

-- 첫 번째 차 확인
SELECT * FROM teas LIMIT 1;

-- 첫 번째 노트 확인 (관계 포함)
SELECT n.*, t.name as tea_name, u.name as user_name
FROM notes n
JOIN teas t ON n.teaId = t.id
JOIN users u ON n.userId = u.id
LIMIT 1;
```

## 문제 해결

### 마이그레이션 실패 시

1. **트랜잭션 롤백 확인**
   - Node.js 스크립트는 자동으로 롤백합니다
   - SQL 직접 실행 시 수동 롤백 필요

2. **백업에서 복원**
   ```bash
   mysql -h HOST -P PORT -u USER -p DATABASE < backup_YYYYMMDD_HHMMSS.sql
   ```

3. **임시 테이블 정리**
   ```sql
   DROP TABLE IF EXISTS `_uuid_to_int_mapping_users`;
   DROP TABLE IF EXISTS `_uuid_to_int_mapping_teas`;
   DROP TABLE IF EXISTS `_uuid_to_int_mapping_notes`;
   ```

### 일반적인 오류

#### 오류: "Foreign key constraint fails"
- 외래키 제약조건이 제대로 제거되지 않았을 수 있음
- 수동으로 외래키 확인 및 제거 필요

#### 오류: "Duplicate entry"
- 매핑 테이블에 중복이 있을 수 있음
- 매핑 테이블 확인 및 정리 필요

#### 오류: "Table doesn't exist"
- 테이블 이름이 다를 수 있음
- 실제 테이블 이름 확인 필요

## 마이그레이션 후 작업

1. **애플리케이션 재시작**
   - 백엔드 서버 재시작
   - 프론트엔드 캐시 클리어

2. **기존 JWT 토큰 무효화**
   - 사용자 재로그인 필요
   - 또는 JWT 토큰 만료 시간 확인

3. **API 테스트**
   - 모든 CRUD 작업 테스트
   - 외래키 관계 테스트

4. **백업 파일 보관**
   - 마이그레이션 전 백업 파일은 안전한 곳에 보관
   - 최소 1개월 이상 보관 권장

## 롤백 방법

마이그레이션을 되돌리려면:

1. 백업 파일에서 복원
2. 애플리케이션 코드를 UUID 버전으로 되돌리기
3. 데이터베이스 스키마를 UUID 버전으로 되돌리기

## 추가 참고사항

- 마이그레이션은 **단방향**입니다 (INT → UUID로 되돌릴 수 없음)
- 대용량 데이터베이스의 경우 마이그레이션 시간이 오래 걸릴 수 있습니다
- 마이그레이션 중에는 데이터베이스 잠금이 발생할 수 있습니다

