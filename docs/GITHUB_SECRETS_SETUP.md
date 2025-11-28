# GitHub Secrets 설정 가이드

GitHub Actions 자동 배포를 위한 GitHub Secrets 설정 방법입니다.

## 설정 방법

1. GitHub 저장소로 이동
2. **Settings** → **Secrets and variables** → **Actions** 클릭
3. **New repository secret** 버튼 클릭
4. 각 Secret을 아래 순서대로 추가

---

## 1. EC2_DATABASE_URL (필수) 🔴

**설명**: 프로덕션 RDS 데이터베이스 연결 URL

**형식**:
```
mysql://<사용자명>:<비밀번호>@<RDS엔드포인트>:3306/chalog
```

**예시**:
```
mysql://admin:MySecurePassword123@chalog-db.xxxxx.ap-northeast-2.rds.amazonaws.com:3306/chalog
```

**실제 엔드포인트** (프로젝트):
```
database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com
```

**실제 설정 예시**:
```
mysql://admin:실제비밀번호@database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com:3306/chalog
```

**값 확인 방법**:
1. AWS 콘솔 → RDS → 데이터베이스 선택
2. "연결 및 보안" 탭에서 **엔드포인트** 복사
3. 마스터 사용자명과 비밀번호는 RDS 생성 시 설정한 값 사용
4. 데이터베이스 이름은 `chalog` (또는 생성 시 설정한 이름)

**주의사항**:
- 비밀번호에 특수문자가 포함된 경우 URL 인코딩 필요 (`@` → `%40`, `#` → `%23` 등)
- 실제 프로덕션 비밀번호 사용 (예시 값 사용 금지)

---

## 2. EC2_JWT_SECRET (필수) 🔴

**설명**: JWT 토큰 서명용 비밀키

**형식**: 강력한 랜덤 문자열 (최소 32자 이상 권장)

**생성 방법**:

### 방법 1: OpenSSL 사용 (권장)
```bash
openssl rand -base64 32
```

### 방법 2: Node.js 사용
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 방법 3: 온라인 생성기
- https://randomkeygen.com/ (256-bit 키 사용)

**예시** (실제로는 더 긴 랜덤 문자열):
```
aB3dEf9gHiJkLmNoPqRsTuVwXyZ1234567890AbCdEfGhIjKlMnOpQrStUvWxYz
```

**주의사항**:
- 프로덕션 환경에서는 반드시 강력한 랜덤 값 사용
- 예시 값(`your-production-secret-key-change-this`) 사용 금지
- 한 번 설정하면 변경하지 않는 것이 좋음 (기존 토큰이 무효화됨)

---

## 3. EC2_FRONTEND_URL (선택) 🟡

**설명**: 메인 프론트엔드 URL (CORS 허용용)

**형식**: 프론트엔드 도메인 URL

**예시**:
```
https://cha-log-gilt.vercel.app
```

**값 확인 방법**:
- Vercel 배포 URL 또는 커스텀 도메인
- 프로토콜(`https://`) 포함

**주의사항**:
- 설정하지 않으면 기본값 `https://cha-log-gilt.vercel.app` 사용
- 로컬 개발용이 아닌 프로덕션 URL만 설정

---

## 4. EC2_FRONTEND_URLS (선택) 🟡

**설명**: 허용할 프론트엔드 URL 목록 (CORS 허용용, 쉼표로 구분)

**형식**: 여러 URL을 쉼표로 구분

**예시**:
```
https://cha-log-gilt.vercel.app,http://localhost:5173,http://localhost:5174
```

**권장 설정**:
```
https://cha-log-gilt.vercel.app,http://localhost:5173,http://localhost:5174
```

**주의사항**:
- 프로덕션 URL과 로컬 개발 URL 모두 포함 가능
- 각 URL 사이에 공백 없이 쉼표(`,`)로만 구분
- 설정하지 않으면 기본값 사용

---

## 기존에 설정된 Secrets 확인

이미 설정된 Secrets:
- ✅ `EC2_SSH_KEY` - SSH 개인 키
- ✅ `EC2_HOST` - EC2 Public IP
- ✅ `EC2_USER` - EC2 사용자명 (보통 `ubuntu`)

**새로 추가해야 할 Secrets**:
- 🔴 `EC2_DATABASE_URL` (필수)
- 🔴 `EC2_JWT_SECRET` (필수)
- 🟡 `EC2_FRONTEND_URL` (선택)
- 🟡 `EC2_FRONTEND_URLS` (선택)

---

## 설정 확인

모든 Secrets 설정 후:

1. **GitHub Actions 워크플로우 실행**
   - 저장소 → **Actions** 탭
   - "Deploy Backend to EC2" 워크플로우 선택
   - **Run workflow** 클릭

2. **로그 확인**
   - 워크플로우 실행 중 로그 확인
   - "📤 .env 파일 생성 중..." 단계에서 오류가 없어야 함
   - "✅ .env 파일 생성 완료" 메시지 확인

3. **배포 확인**
   - EC2 서버에 SSH 접속
   ```bash
   ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
   ```
   - .env 파일 확인
   ```bash
   cat /home/ubuntu/chalog-backend/.env
   ```
   - PM2 로그 확인
   ```bash
   pm2 logs chalog-backend
   ```

---

## 문제 해결

### "EC2_DATABASE_URL이 설정되지 않았습니다" 오류

**원인**: GitHub Secrets에 `EC2_DATABASE_URL`이 설정되지 않음

**해결**:
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. `EC2_DATABASE_URL` Secret 추가
3. RDS 엔드포인트와 비밀번호 확인

### "EC2_JWT_SECRET이 설정되지 않았습니다" 오류

**원인**: GitHub Secrets에 `EC2_JWT_SECRET`이 설정되지 않음

**해결**:
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. `EC2_JWT_SECRET` Secret 추가
3. 강력한 랜덤 문자열 생성하여 설정

### 데이터베이스 연결 실패

**원인**: `EC2_DATABASE_URL` 형식 오류 또는 RDS 보안 그룹 설정 문제

**해결**:
1. `EC2_DATABASE_URL` 형식 확인 (특수문자 URL 인코딩)
2. RDS 보안 그룹에서 EC2 보안 그룹 허용 확인
3. RDS 엔드포인트와 포트(3306) 확인

---

## 보안 권장사항

1. **비밀번호 강도**
   - 최소 16자 이상
   - 대소문자, 숫자, 특수문자 포함

2. **JWT Secret 강도**
   - 최소 32자 이상
   - 랜덤 생성기 사용

3. **Secret 로테이션**
   - 정기적으로 비밀번호 변경 (3-6개월)
   - 변경 시 모든 환경 동기화

4. **접근 제한**
   - GitHub 저장소 접근 권한 제한
   - Actions 권한은 필요한 사람만 부여

