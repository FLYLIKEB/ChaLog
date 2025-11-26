# VSCode에서 데이터베이스 보기

VSCode에서 ChaLog 데이터베이스의 테이블과 데이터를 확인하는 방법입니다.

## 방법 1: SQLTools 확장 프로그램 사용 (권장)

### 1. 확장 프로그램 설치

1. VSCode에서 `Cmd+Shift+X` (Mac) 또는 `Ctrl+Shift+X` (Windows/Linux)로 확장 프로그램 패널 열기
2. "SQLTools" 검색
3. **SQLTools** (by Matheus Teixeira) 설치
4. **SQLTools MySQL/MariaDB** 드라이버 설치

### 2. 연결 설정

프로젝트 루트의 `.vscode/settings.json` 파일에 연결 정보가 이미 설정되어 있습니다.

**중요:** 비밀번호는 `.env` 파일에서 확인하여 수동으로 입력해야 합니다.

1. `backend/.env` 파일에서 `DATABASE_URL` 확인
   - 형식: `mysql://admin:비밀번호@localhost:3307/chalog`
   - 비밀번호 부분을 복사

2. VSCode에서 `Cmd+Shift+P` (Mac) 또는 `Ctrl+Shift+P` (Windows/Linux)
3. "SQLTools: Add New Connection" 선택
4. 또는 SQLTools 사이드바에서 "+" 버튼 클릭
5. 연결 정보 입력:
   - **Connection Name**: ChaLog Database
   - **Server**: localhost
   - **Port**: 3307
   - **Database**: chalog
   - **Username**: admin
   - **Password**: `.env` 파일의 비밀번호 입력
   - **Driver**: MySQL

### 3. SSH 터널 확인

**중요:** VSCode에서 데이터베이스에 연결하려면 SSH 터널이 실행 중이어야 합니다.

```bash
cd backend
./scripts/start-ssh-tunnel.sh
```

터널 상태 확인:
```bash
ps aux | grep "ssh.*3307"
```

### 4. 데이터베이스 연결 및 사용

1. VSCode 왼쪽 사이드바에서 SQLTools 아이콘 클릭
2. "ChaLog Database" 연결을 우클릭 → "Connect"
3. 연결 성공 후:
   - 데이터베이스 확장 → `chalog` 선택
   - 테이블 목록 확인 (`users`, `teas`, `notes`)
   - 테이블 우클릭 → "Show Table Records"로 데이터 확인
   - 또는 쿼리 에디터에서 SQL 실행

### 5. 쿼리 실행

1. SQLTools 사이드바에서 "New Query" 클릭
2. SQL 쿼리 작성 예시:

```sql
-- 모든 사용자 확인
SELECT * FROM users;

-- 모든 차 확인
SELECT * FROM teas;

-- 모든 노트 확인
SELECT * FROM notes;

-- 노트와 차 정보 함께 보기
SELECT 
  n.id,
  n.rating,
  n.memo,
  t.name as tea_name,
  t.type as tea_type,
  u.name as user_name
FROM notes n
JOIN teas t ON n.teaId = t.id
JOIN users u ON n.userId = u.id
ORDER BY n.createdAt DESC;
```

## 방법 2: Database Client 확장 프로그램 사용

### 1. 확장 프로그램 설치

1. "Database Client" (by Weijan Chen) 검색 및 설치

### 2. 연결 설정

1. VSCode 왼쪽 사이드바에서 Database Client 아이콘 클릭
2. "+" 버튼 클릭 → "MySQL" 선택
3. 연결 정보 입력:
   - **Host**: localhost
   - **Port**: 3307
   - **User**: admin
   - **Password**: `.env` 파일의 비밀번호
   - **Database**: chalog

### 3. 사용

- 연결 후 데이터베이스 트리에서 테이블 선택
- 데이터 확인 및 편집 가능

## 방법 3: MySQL 확장 프로그램 사용

### 1. 확장 프로그램 설치

1. "MySQL" (by Jun Han) 검색 및 설치

### 2. 연결 설정

1. `Cmd+Shift+P` → "MySQL: Connect to MySQL Server"
2. 연결 정보 입력

## 문제 해결

### 연결 실패 시

1. **SSH 터널 확인**
   ```bash
   ps aux | grep "ssh.*3307"
   ```
   - 없으면: `cd backend && ./scripts/start-ssh-tunnel.sh`

2. **포트 확인**
   ```bash
   lsof -i :3307
   ```
   - 포트가 열려있어야 함

3. **비밀번호 확인**
   - `backend/.env` 파일의 `DATABASE_URL`에서 비밀번호 확인
   - URL 형식: `mysql://admin:비밀번호@localhost:3307/chalog`

4. **연결 테스트**
   ```bash
   mysql -h localhost -P 3307 -u admin -p
   ```
   - 비밀번호 입력 후 연결 확인

### 권장 확장 프로그램

- **SQLTools**: 가장 인기 있고 기능이 풍부함 (권장)
- **Database Client**: 직관적인 UI
- **MySQL**: 간단한 MySQL 전용 확장

## 보안 참고사항

- `.vscode/settings.json`에 비밀번호를 저장하지 마세요 (현재는 빈 문자열)
- 연결 시마다 비밀번호를 입력하거나
- VSCode의 Secret Storage를 사용하세요

