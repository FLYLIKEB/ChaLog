# 보안 가이드

## 중요: SSH 키 파일 관리

**절대 Git에 커밋하지 마세요!**

SSH 개인 키 파일(`*.pem`, `*.key`)은 민감한 정보이므로 Git 저장소에 포함되면 안 됩니다.

### 안전한 관리 방법

1. **SSH 키는 `~/.ssh/` 디렉토리에 저장**
   ```bash
   # 권장 위치
   ~/.ssh/your-key.pem
   ```

2. **`.gitignore`에 포함됨**
   - `*.pem`
   - `*.key`
   - 모든 SSH 키 파일

3. **환경 변수로 경로 관리**
   ```env
   SSH_KEY_PATH=~/.ssh/your-key.pem
   ```

### 만약 실수로 커밋한 경우

1. **즉시 키 교체**
   - AWS 콘솔에서 새 키 페어 생성
   - EC2 인스턴스에 새 키 적용

2. **Git 히스토리에서 제거**
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch your-key.pem" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **강제 푸시 (주의!)**
   ```bash
   git push origin --force --all
   ```

### 환경 변수 파일

`.env` 파일도 Git에 포함되지 않도록 `.gitignore`에 추가되어 있습니다.

### 보안 체크리스트

- [ ] `.pem`, `.key` 파일이 `.gitignore`에 포함됨
- [ ] SSH 키가 `~/.ssh/` 디렉토리에 있음
- [ ] 루트 디렉토리에 키 파일이 없음
- [ ] 환경 변수로 키 경로 관리
- [ ] Git 상태에서 키 파일이 추적되지 않음

