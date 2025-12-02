# 카카오 개발자 콘솔 설정 가이드

## KOE009 오류 해결 방법

"Admin Settings Issue (KOE009)" 오류는 카카오 개발자 콘솔에서 필수 설정이 완료되지 않았을 때 발생합니다.

### 해결 단계

#### 1. 카카오 개발자 콘솔 접속
- [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
- 로그인 후 내 애플리케이션 선택

#### 2. 앱 키 확인

**중요:** 프론트엔드에서 카카오 SDK를 사용할 때는 **JavaScript 키**를 사용해야 합니다!

- **앱 키** 섹션에서 **JavaScript 키** 확인
- 현재 사용 중인 JavaScript 키: `a5654b03ecef8d26990a2f1fcb26fc05`
- **REST API 키**는 백엔드 서버에서만 사용 (프론트엔드에서는 사용하지 않음)

**키 종류 설명:**
- **JavaScript 키**: 프론트엔드에서 카카오 SDK 초기화 시 사용 (공개되어도 안전)
- **REST API 키**: 백엔드 서버에서 카카오 API 호출 시 사용 (서버에만 보관)

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

#### 8. 웹훅 설정 (필수 - 개인정보 보호)

**중요:** 가입한 회원의 개인정보 관리를 위해 웹훅(계정 상태 변경 웹훅)을 설정해야 합니다. 미설정 시, 서비스 외부에서의 회원 탈퇴 정보를 전달받을 수 없어 개인정보 처리가 누락될 수 있습니다.

**웹훅이란?**
- 카카오 로그인 사용자의 계정 상태 변경(연결 해제, 탈퇴 등)을 서버에 자동으로 알려주는 기능
- 사용자가 카카오에서 서비스 연결을 해제하거나 탈퇴할 때 백엔드 서버로 알림을 전송

**설정 방법:**

1. **제품 설정** → **카카오 로그인** → **웹훅** 메뉴 이동

2. **계정 상태 변경 웹훅** 등록:
   - **웹훅 URL** 입력:
     - 개발 환경: `http://localhost:3000/auth/kakao/webhook` (로컬 테스트용)
     - 프로덕션 환경: `https://your-backend-domain.com/auth/kakao/webhook`
   - **웹훅 테스트** 버튼으로 연결 확인 (선택사항)

3. **저장** 클릭

**백엔드 웹훅 엔드포인트 구현 필요:**

웹훅을 받기 위해 백엔드에 다음 엔드포인트를 구현해야 합니다:

```typescript
// backend/src/auth/auth.controller.ts
@Post('kakao/webhook')
async handleKakaoWebhook(@Body() webhookData: any) {
  // webhookData 예시:
  // {
  //   "event": "user.unlink",  // 연결 해제
  //   "user_id": "123456789"   // 카카오 사용자 ID
  // }
  
  // 카카오 사용자 ID로 사용자 찾기
  // UserAuthentication에서 provider='kakao', providerId=user_id인 레코드 찾기
  // 해당 사용자의 카카오 인증 정보 삭제 또는 사용자 계정 비활성화
}
```

**웹훅 이벤트 타입:**
- `user.unlink`: 사용자가 카카오에서 서비스 연결 해제
- 기타 계정 상태 변경 이벤트

**주의사항:**
- 웹훅 URL은 HTTPS를 사용해야 합니다 (프로덕션 환경)
- 개발 환경에서는 로컬 터널링 도구(ngrok 등)를 사용하여 테스트할 수 있습니다
- 웹훅 요청은 카카오 서버에서 직접 전송되므로, IP 화이트리스트 설정이 필요할 수 있습니다

### 체크리스트

다음 항목들을 모두 확인하세요:

- [ ] 웹 플랫폼 등록됨 (`http://localhost:5173`, `http://localhost:5174`, `https://cha-log-gilt.vercel.app`)
- [ ] 카카오 로그인 활성화됨
- [ ] Redirect URI 등록됨 (`http://localhost:5173`, `http://localhost:5174`, `https://cha-log-gilt.vercel.app`)
- [ ] 동의항목 설정 완료 (닉네임 필수)
- [ ] 앱 상태가 "서비스 중" 또는 "개발 중"
- [ ] 서비스 약관 동의 완료
- [ ] 웹훅 등록됨 (계정 상태 변경 웹훅) - 개인정보 보호 필수
- [ ] 백엔드 웹훅 엔드포인트 구현 완료
- [ ] Vercel 환경 변수 설정됨 (`VITE_KAKAO_APP_KEY`)

### 환경 변수 확인

프론트엔드 `.env` 파일 확인:
```env
# JavaScript 키 사용 (REST API 키가 아님!)
VITE_KAKAO_APP_KEY=a5654b03ecef8d26990a2f1fcb26fc05
```

**주의:** 
- `VITE_KAKAO_APP_KEY`에는 **JavaScript 키**를 사용해야 합니다
- REST API 키를 사용하면 카카오 SDK 초기화가 실패할 수 있습니다

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

#### 여전히 KOE009 또는 401 Unauthorized 오류가 발생하는 경우

**401 Unauthorized 오류 해결:**

1. **현재 사용 중인 포트 확인**:
   - 브라우저 주소창에서 실제 포트 번호 확인 (예: `http://localhost:5173`)
   - 네트워크 탭에서 요청 URL의 `origin` 파라미터 확인

2. **카카오 개발자 콘솔 설정 확인** (순서대로):
   
   **A. 앱 상태 확인 (가장 중요!)**
   - **앱 설정** → **앱 상태** 메뉴 이동
   - 상태가 **"서비스 중지"**인 경우 → **"서비스 시작"** 클릭
   - 상태가 **"서비스 중"** 또는 **"개발 중"**인지 확인
   
   **B. 웹 플랫폼 등록 확인**
   - **앱 설정** → **플랫폼** 메뉴 이동
   - **Web 플랫폼** 섹션에서 `http://localhost:5173`이 등록되어 있는지 확인
   - 없으면 **"Web 플랫폼 등록"** 클릭하여 추가
   - 여러 포트를 모두 등록: `http://localhost:5173`, `http://localhost:5174`, `http://localhost:5175`
   
   **C. 카카오 로그인 활성화 확인**
   - **제품 설정** → **카카오 로그인** 메뉴 이동
   - **활성화 설정**이 **"활성화"**로 되어 있는지 확인
   - **Redirect URI**에 `http://localhost:5173` 등록 확인
   
3. **설정 저장 후 대기**:
   - 모든 설정을 **저장** 클릭
   - **5-10분 대기** (카카오 서버에 설정이 반영되는 시간)

4. **브라우저 캐시 삭제 및 재시도**:
   - 브라우저 캐시 삭제 (Cmd+Shift+Delete / Ctrl+Shift+Delete)
   - 또는 시크릿 모드로 테스트
   - 페이지 새로고침 후 다시 시도

5. **카카오 앱 키 확인**:
   - **앱 키** 섹션에서 **JavaScript 키** 확인 (REST API 키가 아님!)
   - `.env` 파일의 `VITE_KAKAO_APP_KEY`에 JavaScript 키가 설정되어 있는지 확인
   - JavaScript 키는 프론트엔드에서만 사용하며, REST API 키와는 다릅니다

6. **네트워크 요청 확인**:
   - 브라우저 개발자 도구 → Network 탭
   - 카카오 로그인 시도 시 `kauth.kakao.com` 요청 확인
   - `origin` 파라미터가 `http://localhost:5173`인지 확인
   - 해당 도메인이 카카오 개발자 콘솔에 등록되어 있는지 재확인

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
   - `VITE_KAKAO_APP_KEY=a5654b03ecef8d26990a2f1fcb26fc05` 추가 (JavaScript 키 사용!)
   - Environment: Production, Preview, Development 모두 선택
   - 자세한 내용: [`docs/deployment/VERCEL_ENV_SETUP.md`](../deployment/VERCEL_ENV_SETUP.md)

2. **카카오 개발자 콘솔에 프로덕션 도메인 등록**:
   - 웹 플랫폼: `https://cha-log-gilt.vercel.app`
   - Redirect URI: `https://cha-log-gilt.vercel.app`

### 참고 자료

- [카카오 개발자 문서 - 카카오 로그인](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [카카오 개발자 문서 - 플랫폼 설정](https://developers.kakao.com/docs/latest/ko/getting-started/app-key)
- [카카오 개발자 문서 - 웹훅](https://developers.kakao.com/docs/latest/ko/kakaologin/webhook)

