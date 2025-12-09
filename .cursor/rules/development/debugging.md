## Debugging Process (TDD-based)

### 1. Reproduce with Failing Test
- Write a **failing test** that reproduces the bug
- If reproduction fails, inform the user
- **Do not start fixing** until explicitly asked

### 2. Identify Root Cause
- Analyze possible causes and explain **why** and **when** it occurs
- Suggest verification methods (what to log, what to check)
- **Only explain**, don't execute yet

### 3. Fix with Ideal Flow
- Add test file to `.cursorignore`
- Create a **flowchart** of ideal behavior
- Fix code to make test pass
- Inform user if confirmation needed

### Key Principle
**Understand first, fix second** - Never fix without understanding root cause

## Backend Server Logging

### 서버 로그 확인 방법
백엔드 서버의 에러 로그를 확인할 때는 다음 방법을 사용:

1. **백엔드 서버를 포그라운드로 실행**:
   ```bash
   cd backend
   npm run start:dev
   ```
   이렇게 하면 서버 로그가 실시간으로 표시됩니다.

2. **로그 파일로 확인** (백그라운드 실행 시):
   ```bash
   # 서버를 로그 파일로 실행
   cd backend && npm run start:dev 2>&1 | tee /tmp/backend-logs.txt &
   
   # 로그 확인
   tail -f /tmp/backend-logs.txt
   ```

3. **포트 충돌 해결**:
   ```bash
   # 포트 3000을 사용하는 프로세스 종료
   lsof -ti:3000 | xargs kill -9 2>/dev/null
   ```

### 에러 발생 시 확인 사항
- 백엔드 서버가 실행 중인지 확인 (`http://localhost:3000/health`)
- 브라우저에서 요청을 보낼 때 백엔드 터미널에 에러 로그가 출력되는지 확인
- `enrichNotesWithLikesAndBookmarks` 같은 복잡한 메서드에서는 상세한 에러 로깅 추가
- TypeORM의 `getRawMany()` 결과는 다양한 키 형식으로 반환될 수 있으므로 안전하게 처리
