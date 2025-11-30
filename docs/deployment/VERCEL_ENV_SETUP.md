# Vercel 환경 변수 설정 가이드

프로덕션 환경에서 발생하는 CORS 오류를 해결하기 위한 Vercel 환경 변수 설정 가이드입니다.

## 🔴 오류 메시지

### 오류 1: CORS Policy (환경 변수 미설정)
```
Access to fetch at 'http://localhost:3000/teas' from origin 'https://cha-log-gilt.vercel.app' 
has been blocked by CORS policy: Request had a target IP address space of `unknown` 
yet the resource is in address space `loopback`.
```

### 오류 2: Mixed Content (HTTPS → HTTP 요청)
```
Mixed Content: The page at 'https://cha-log-gilt.vercel.app/' was loaded over HTTPS, 
but requested an insecure resource 'http://52.78.150.124:3000/teas'. 
This request has been blocked; the content must be served over HTTPS.
```

## 원인 분석

### 오류 1: CORS Policy (환경 변수 미설정)

**문제 상황:**
- **프로덕션 URL**: `https://cha-log-gilt.vercel.app` (HTTPS)
- **요청 대상**: `http://localhost:3000` (로컬호스트)
- **오류**: 브라우저가 HTTPS 사이트에서 localhost로의 요청을 차단

**원인:**
1. **환경 변수 미설정**: Vercel에 `VITE_API_BASE_URL`이 설정되지 않음
2. **기본값 사용**: 코드에서 기본값 `http://localhost:3000` 사용
3. **브라우저 보안 정책**: HTTPS → HTTP localhost 요청 차단 (Private Network Access 정책)

### 오류 2: Mixed Content (HTTPS → HTTP 요청)

**문제 상황:**
- **프로덕션 URL**: `https://cha-log-gilt.vercel.app` (HTTPS)
- **요청 대상**: `http://52.78.150.124:3000` (HTTP)
- **오류**: 브라우저가 HTTPS 페이지에서 HTTP 리소스 요청을 차단

**원인:**
1. **환경 변수는 설정됨**: `VITE_API_BASE_URL=http://52.78.150.124:3000` ✅
2. **하지만 HTTP 사용**: 백엔드가 HTTP로만 서비스되고 있음
3. **브라우저 보안 정책**: Mixed Content 정책으로 HTTPS → HTTP 요청 차단

**해결 방법:**
- 백엔드에 HTTPS 설정 필요 (Nginx + SSL 인증서)
- 또는 임시로 HTTP 사용 (보안 위험, 권장하지 않음)

## 해결 방법

### 🔴 오류 1 해결: 환경 변수 설정

#### 1단계: Vercel 대시보드 접속

1. https://vercel.com/dashboard 접속
2. 로그인 후 프로젝트 선택: `cha-log-gilt`

#### 2단계: 환경 변수 설정

**경로**: 프로젝트 → **Settings** → **Environment Variables**

##### 필수 환경 변수 1: `VITE_API_BASE_URL`

1. **Add New** 클릭
2. 다음 정보 입력:
   ```
   Key: VITE_API_BASE_URL
   Value: http://52.78.150.124:3000  (임시, 오류 2 해결 후 HTTPS로 변경)
   Environment: Production, Preview, Development 모두 선택 ✅
   ```
3. **Save** 클릭

> ⚠️ **주의**: 현재는 HTTP를 사용하지만, 오류 2 해결 후 HTTPS로 변경해야 합니다.

### 🔴 오류 2 해결: Mixed Content 오류

**문제**: HTTPS 페이지에서 HTTP 리소스를 요청할 수 없음

**해결 방법 2가지:**

#### 방법 1: 백엔드에 HTTPS 설정 (권장) ⭐

백엔드 서버에 Nginx와 SSL 인증서를 설정하여 HTTPS로 서비스합니다.

**필요한 것:**
- 도메인 (예: `api.yourdomain.com`) - **필수**
- Let's Encrypt SSL 인증서 (무료)

**단계별 가이드:**
📖 **상세 가이드**: [`docs/deployment/HTTPS_SETUP_GUIDE.md`](./HTTPS_SETUP_GUIDE.md) 참고

**요약:**
1. 도메인 DNS A 레코드를 EC2 Public IP(`52.78.150.124`)에 연결
2. EC2에 Nginx 설치 및 설정
3. Let's Encrypt로 SSL 인증서 발급
4. Vercel 환경 변수를 `https://api.yourdomain.com`으로 변경
5. 재배포

> ⚠️ **중요**: 도메인이 없으면 SSL 인증서를 발급받을 수 없습니다. 도메인을 먼저 준비하세요.

#### 방법 2: 임시 해결책 (개발/테스트용, 권장하지 않음)

브라우저의 Mixed Content 정책을 우회하는 방법입니다. **프로덕션에서는 사용하지 마세요.**

**Chrome/Edge:**
1. 주소창에 `chrome://flags/#block-insecure-private-network-requests` 입력
2. "Block insecure private network requests" 비활성화
3. 브라우저 재시작

**또는 개발자 도구에서:**
1. F12 → Security 탭
2. "Allow insecure content" 체크

> ⚠️ **보안 경고**: 이 방법은 보안을 약화시키므로 개발/테스트 목적으로만 사용하세요.

##### 필수 환경 변수 2: `VITE_KAKAO_APP_KEY`

1. **Add New** 클릭
2. 다음 정보 입력:
   ```
   Key: VITE_KAKAO_APP_KEY
   Value: 4b8291c637c5ad9b0a502eee797ca890
   Environment: Production, Preview, Development 모두 선택 ✅
   ```
3. **Save** 클릭

#### 3단계: 재배포

환경 변수는 **빌드 시점**에 주입되므로 재배포가 필요합니다.

**방법 1: 자동 재배포**
- 환경 변수 저장 후 자동으로 재배포가 시작될 수 있습니다
- Deployments 탭에서 배포 상태 확인

**방법 2: 수동 재배포**
1. **Deployments** 탭 이동
2. 최신 배포의 **⋯** (점 3개) 메뉴 클릭
3. **Redeploy** 선택
4. **Redeploy** 확인

### 4단계: 확인

배포 완료 후 (보통 1-3분 소요):

1. **브라우저 콘솔 확인** (F12)
   - 경고 메시지가 사라졌는지 확인
   - `VITE_API_BASE_URL` 관련 오류가 없는지 확인

2. **네트워크 탭 확인**
   - 요청 URL이 `http://52.78.150.124:3000`으로 변경되었는지 확인
   - `localhost:3000`으로 요청하지 않는지 확인
   - ⚠️ Mixed Content 오류가 발생하면 "오류 2 해결" 참고

3. **실제 동작 확인**
   - `https://cha-log-gilt.vercel.app` 접속
   - API 요청이 정상적으로 작동하는지 확인

## 환경 변수 확인 방법

### 빌드된 파일에서 확인

배포 후 빌드된 JavaScript 파일에서 환경 변수가 제대로 주입되었는지 확인:

1. Vercel 배포 페이지에서 배포된 사이트 접속
2. 브라우저 개발자 도구 (F12) → **Sources** 탭
3. 빌드된 JavaScript 파일 (`index-*.js`) 열기
4. `VITE_API_BASE_URL` 또는 `52.78.150.124` 검색
5. 환경 변수 값이 포함되어 있으면 정상

### 브라우저 콘솔에서 확인

배포된 사이트의 브라우저 콘솔에서:

```javascript
// 환경 변수 확인 (빌드 시점에 주입됨)
console.log(import.meta.env.VITE_API_BASE_URL);
// 예상 출력: "http://52.78.150.124:3000"
```

## 문제 해결 체크리스트

- [ ] Vercel 대시보드에서 환경 변수 설정 완료
- [ ] `VITE_API_BASE_URL` 값이 `http://52.78.150.124:3000`으로 설정됨
- [ ] `VITE_KAKAO_APP_KEY` 값이 설정됨
- [ ] Production, Preview, Development 모두 선택됨
- [ ] 환경 변수 저장 후 재배포 완료
- [ ] 배포 완료 후 브라우저 콘솔에서 오류 확인
- [ ] 네트워크 탭에서 요청 URL 확인

## 추가 참고사항

### 환경 변수 작동 원리

1. **빌드 시점**: Vite가 빌드할 때 `import.meta.env.VITE_*` 변수를 실제 값으로 치환
2. **런타임**: 빌드된 파일에 환경 변수 값이 하드코딩됨
3. **재배포 필요**: 환경 변수 변경 시 반드시 재배포 필요

### 주의사항

- ⚠️ 환경 변수는 빌드 시점에 주입되므로, 변경 후 반드시 재배포해야 합니다
- ⚠️ 환경 변수 이름은 반드시 `VITE_`로 시작해야 합니다 (Vite 요구사항)
- ⚠️ Production, Preview, Development를 모두 선택하는 것을 권장합니다

## 오류별 해결 요약

| 오류 | 원인 | 해결 방법 |
|------|------|-----------|
| CORS Policy (localhost) | 환경 변수 미설정 | Vercel에 `VITE_API_BASE_URL` 설정 |
| Mixed Content | HTTPS → HTTP 요청 | 백엔드에 HTTPS 설정 (Nginx + SSL) |

## 다음 단계

1. ✅ **오류 1 해결**: Vercel 환경 변수 설정 완료
2. 🔄 **오류 2 해결**: 백엔드 HTTPS 설정 필요
   - 도메인 준비
   - Nginx + Let's Encrypt 설정
   - Vercel 환경 변수를 HTTPS로 변경

## 관련 문서

- [`docs/deployment/HTTPS_SETUP_GUIDE.md`](./HTTPS_SETUP_GUIDE.md) - 백엔드 HTTPS 설정 상세 가이드 ⭐
- [`docs/configuration/ENVIRONMENT_VARIABLES.md`](../configuration/ENVIRONMENT_VARIABLES.md) - 환경 변수 관리 가이드
- [`docs/deployment/AWS_EC2_DEPLOYMENT.md`](./AWS_EC2_DEPLOYMENT.md) - 백엔드 배포 가이드

