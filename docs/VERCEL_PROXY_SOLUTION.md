# Vercel 프록시를 통한 Mixed Content 해결

도메인 구매 없이 Vercel의 rewrites 기능을 사용하여 Mixed Content 오류를 해결하는 방법입니다.

## 🎯 해결 방법

Vercel의 `routes`(구 rewrite) 기능을 사용하여:
- 프론트엔드: `https://cha-log-gilt.vercel.app`
- API 요청: `https://cha-log-gilt.vercel.app/api/*` → Vercel이 자동으로 EC2로 프록시
- **같은 도메인**이므로 Mixed Content 오류 없음!

## ✅ 장점

1. **도메인 구매 불필요** - Vercel 기본 도메인 사용
2. **SSL 자동 적용** - Vercel이 HTTPS 제공
3. **설정 간단** - `vercel.json`만 수정
4. **비용 절감** - 도메인 구매 비용 없음

## 📋 설정 방법

### 1단계: vercel.json 수정

`vercel.json`에 API 프록시를 위한 routes를 추가:

```json
{
  "builds": [
    { "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } },
    { "src": "api/[...path].ts", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/$1" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### 2단계: Serverless Function API 프록시 생성

`api/[...path].ts` 파일을 생성하여 모든 `/api/*` 요청을 백엔드로 프록시합니다. `BACKEND_URL` 환경 변수로 대상 백엔드 URL을 관리합니다.

### 3단계: API 클라이언트 수정

`src/lib/api.ts`에서 프로덕션 환경일 때 `/api` 사용:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (() => {
  // 프로덕션(Vercel): /api 프록시 사용
  if (import.meta.env.PROD && window.location.hostname.includes('vercel.app')) {
    return '/api';
  }
  // 개발 환경
  return 'http://localhost:3000';
})();
```

### 4단계: 환경 변수 설정

- `.env.example` → `BACKEND_URL`, `BACKEND_TIMEOUT_MS` 추가
- Vercel 대시보드 → Settings → Environment Variables
  - `BACKEND_URL` = `http://52.78.150.124:3000`
  - `BACKEND_TIMEOUT_MS` (선택, 기본 10000)
  - `LOG_PROXY_REQUESTS` (선택, 기본 true)

### 5단계: 배포

변경사항 커밋 및 푸시:

```bash
git add vercel.json src/lib/api.ts
git commit -m "feat: Vercel 프록시를 통한 Mixed Content 해결"
git push
```

Vercel이 자동으로 재배포합니다.

## 🔄 작동 원리

### 요청 흐름

1. **프론트엔드 요청**
   ```
   https://cha-log-gilt.vercel.app/api/teas
   ```

2. **Vercel rewrites**
   ```
   /api/teas → http://52.78.150.124:3000/teas
   ```

3. **EC2 백엔드 응답**
   ```
   EC2 → Vercel → 프론트엔드
   ```

### 환경별 동작

**프로덕션 (Vercel):**
- 요청: `https://cha-log-gilt.vercel.app/api/teas`
- Vercel이 `http://52.78.150.124:3000/teas`로 프록시
- HTTPS → HTTP (서버 간 통신이므로 Mixed Content 문제 없음)

**개발 환경:**
- 요청: `http://localhost:5173` → `http://localhost:3000/teas`
- 직접 연결 (프록시 없음)

## ⚠️ 주의사항

### 1. Vercel 환경 변수 제거

더 이상 `VITE_API_BASE_URL` 환경 변수가 필요하지 않습니다.
- Vercel 대시보드에서 제거해도 됨 (선택사항)
- 또는 그대로 두어도 무방 (사용되지 않음)

### 2. 백엔드 CORS 설정

백엔드의 CORS 설정에서 Vercel 도메인 허용 확인:

```typescript
// backend/src/main.ts
const allowedOrigins = [
  'https://cha-log-gilt.vercel.app', // ✅ 이미 포함됨
  // ...
];
```

### 3. Vercel 타임아웃

- Vercel Serverless Functions: 최대 10초 (Hobby 플랜)
- Vercel Pro: 최대 60초
- 긴 요청이 있다면 타임아웃 주의

## 🧪 테스트

### 배포 후 확인

1. **프로덕션 사이트 접속**
   ```
   https://cha-log-gilt.vercel.app
   ```

2. **브라우저 콘솔 확인**
   - Mixed Content 오류 없음 ✅
   - API 요청이 `/api/*`로 가는지 확인

3. **네트워크 탭 확인**
   - 요청 URL: `https://cha-log-gilt.vercel.app/api/teas`
   - 상태 코드: 200 OK

## 🔄 다른 해결 방법과 비교

| 방법 | 비용 | 복잡도 | 권장도 |
|------|------|--------|--------|
| **Vercel 프록시** | 무료 | ⭐ 간단 | ⭐⭐⭐⭐⭐ |
| 도메인 + SSL | $8-15/년 | ⭐⭐⭐ 복잡 | ⭐⭐⭐ |

## 문제 해결

### 프록시가 작동하지 않을 때

1. **vercel.json 확인**
   ```bash
   cat vercel.json
   ```

2. **배포 로그 확인**
   - Vercel 대시보드 → Deployments → 로그 확인

3. **API 엔드포인트 확인**
   - 브라우저 네트워크 탭에서 실제 요청 URL 확인

### CORS 오류 발생 시

백엔드 CORS 설정 확인:
```typescript
// backend/src/main.ts
allowedOrigins: [
  'https://cha-log-gilt.vercel.app', // ✅ 포함되어 있는지 확인
]
```

## 완료 확인

- ✅ `vercel.json`에 `/api/*` 프록시 규칙 추가
- ✅ API 클라이언트가 프로덕션에서 `/api` 사용
- ✅ 배포 완료
- ✅ Mixed Content 오류 해결
- ✅ API 요청 정상 작동

## 관련 문서

- [`docs/VERCEL_ENV_SETUP.md`](./VERCEL_ENV_SETUP.md) - Vercel 환경 변수 설정
- [`docs/HTTPS_SETUP_GUIDE.md`](./HTTPS_SETUP_GUIDE.md) - 도메인 + SSL 설정 (대안)

