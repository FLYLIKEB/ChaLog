# 카카오 개발자 콘솔 설정 가이드

## KOE009 오류 해결 방법

"Admin Settings Issue (KOE009)" 오류는 카카오 개발자 콘솔에서 필수 설정이 완료되지 않았을 때 발생합니다.

### 해결 단계

#### 1. 카카오 개발자 콘솔 접속
- [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
- 로그인 후 내 애플리케이션 선택

#### 2. 앱 키 확인
- **앱 키** 섹션에서 **REST API 키** 확인
- 현재 사용 중인 키: `4b8291c637c5ad9b0a502eee797ca890`

#### 3. 플랫폼 설정 (필수)

**웹 플랫폼 등록:**
1. **앱 설정** → **플랫폼** 메뉴 이동
2. **Web 플랫폼 등록** 클릭
3. 사이트 도메인 등록 (여러 개 추가 가능):
   - 개발 환경: `http://localhost:5173` (기본 포트)
   - 개발 환경: `http://localhost:5174` (포트 충돌 시 자동 변경)
   - 개발 환경: `http://localhost:5175` (추가 안전장치)
   - 프로덕션 환경: `https://cha-log-gilt.vercel.app` (Vercel 배포 도메인)
4. **저장** 클릭

**중요:** 
- Vite는 기본적으로 `5173` 포트를 사용하지만, 포트가 사용 중이면 자동으로 `5174`, `5175` 등으로 변경됩니다.
- KOE009 오류를 방지하려면 개발에 사용할 수 있는 모든 포트를 등록하는 것을 권장합니다.
- `http://localhost:3000` (백엔드 API 서버, 필요 시)

#### 4. 카카오 로그인 활성화

1. **제품 설정** → **카카오 로그인** 메뉴 이동
2. **활성화 설정** → **활성화** 선택
3. **동의항목** 설정:
   - 필수: 닉네임, 카카오계정(이메일) - 선택 동의
   - 선택: 프로필 사진 등
4. **Redirect URI** 등록 (여러 개 추가 가능):
   - 개발 환경: `http://localhost:5173` (기본 포트)
   - 개발 환경: `http://localhost:5174` (포트 충돌 시 자동 변경)
   - 개발 환경: `http://localhost:5175` (추가 안전장치)
   - 프로덕션: `https://cha-log-gilt.vercel.app` (Vercel 배포 도메인)
5. **저장** 클릭

#### 5. 동의항목 설정

**필수 동의항목:**
- 닉네임 (필수)
- 카카오계정(이메일) (선택 동의 - 이메일 받으려면 필요)

**설정 방법:**
1. **제품 설정** → **카카오 로그인** → **동의항목**
2. 각 항목의 **필수/선택** 설정
3. **저장** 클릭

#### 6. 앱 상태 확인

1. **앱 설정** → **앱 상태** 확인
2. 상태가 **서비스 중** 또는 **개발 중**인지 확인
3. **서비스 중지** 상태라면 **서비스 시작** 클릭

#### 7. 서비스 약관 동의

1. **앱 설정** → **서비스 약관** 확인
2. 필요한 약관에 동의
3. **저장** 클릭

### 체크리스트

다음 항목들을 모두 확인하세요:

- [ ] 웹 플랫폼 등록됨 (`http://localhost:5173`, `http://localhost:5174`, `https://cha-log-gilt.vercel.app`)
- [ ] 카카오 로그인 활성화됨
- [ ] Redirect URI 등록됨 (`http://localhost:5173`, `http://localhost:5174`, `https://cha-log-gilt.vercel.app`)
- [ ] 동의항목 설정 완료 (닉네임 필수)
- [ ] 앱 상태가 "서비스 중" 또는 "개발 중"
- [ ] 서비스 약관 동의 완료
- [ ] Vercel 환경 변수 설정됨 (`VITE_KAKAO_APP_KEY`)

### 환경 변수 확인

프론트엔드 `.env` 파일 확인:
```env
VITE_KAKAO_APP_KEY=4b8291c637c5ad9b0a502eee797ca890
```

### 테스트 방법

설정 완료 후:

1. **프론트엔드 서버 재시작**:
   ```bash
   npm run dev
   ```

2. **브라우저에서 테스트**:
   - `http://localhost:5173/login` 접속
   - "카카오로 로그인" 버튼 클릭
   - 카카오 로그인 팝업이 정상적으로 나타나는지 확인

### 문제 해결

#### 여전히 KOE009 오류가 발생하는 경우

1. **현재 사용 중인 포트 확인**:
   - 브라우저 주소창에서 실제 포트 번호 확인 (예: `http://localhost:5174`)
   - 오류 메시지의 "Web Domain Used" 확인

2. **카카오 개발자 콘솔에 포트 추가**:
   - **앱 설정** → **플랫폼** → **Web 플랫폼**에서 현재 사용 중인 포트 추가
   - 예: `http://localhost:5174`가 오류 메시지에 나타나면 이 포트를 추가

3. **브라우저 캐시 삭제**

4. **카카오 개발자 콘솔에서 설정 저장 후 5-10분 대기** (설정 반영 시간)

5. **카카오 앱 키 확인**: REST API 키가 올바른지 확인

6. **플랫폼 도메인 확인**: 사용 중인 모든 포트가 등록되었는지 확인

#### 카카오 로그인 팝업이 나타나지 않는 경우

브라우저 콘솔(F12)에서 확인:
```javascript
// 카카오 SDK 로드 확인
console.log(window.Kakao);

// 카카오 SDK 초기화 확인
console.log(window.Kakao.isInitialized());
```

#### 다른 오류 코드

- **KOE006**: 앱 키 오류 → REST API 키 확인
- **KOE101**: 인증 오류 → Redirect URI 확인
- **KOE201**: 동의항목 오류 → 동의항목 설정 확인

### 프로덕션 환경 설정

프로덕션 환경에서도 카카오 로그인이 작동하도록 다음을 확인하세요:

1. **Vercel 환경 변수 설정**:
   - Vercel 대시보드 → Settings → Environment Variables
   - `VITE_KAKAO_APP_KEY=4b8291c637c5ad9b0a502eee797ca890` 추가
   - Environment: Production, Preview, Development 모두 선택
   - 자세한 내용: [`docs/deployment/VERCEL_ENV_SETUP.md`](../deployment/VERCEL_ENV_SETUP.md)

2. **카카오 개발자 콘솔에 프로덕션 도메인 등록**:
   - 웹 플랫폼: `https://cha-log-gilt.vercel.app`
   - Redirect URI: `https://cha-log-gilt.vercel.app`

### 참고 자료

- [카카오 개발자 문서 - 카카오 로그인](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [카카오 개발자 문서 - 플랫폼 설정](https://developers.kakao.com/docs/latest/ko/getting-started/app-key)

