# HTTPS 설정 빠른 시작 가이드

가장 빠르게 HTTPS를 설정하는 방법입니다.

## 🚀 빠른 시작 (3단계)

### 준비물
- ✅ 도메인 (예: `api.yourdomain.com`)
  - 도메인이 없다면: [`docs/DOMAIN_PURCHASE_GUIDE.md`](./DOMAIN_PURCHASE_GUIDE.md) 참고
- ✅ EC2 SSH 접속 가능

### 1단계: DNS 설정 (5분)

도메인 DNS 관리 페이지에서:

```
A 레코드 추가:
- 호스트: api
- 타입: A  
- 값: 52.78.150.124
- TTL: 3600
```

**확인:**
```bash
nslookup api.yourdomain.com
# 52.78.150.124가 나오면 성공
```

### 2단계: EC2에서 스크립트 실행 (10분)

```bash
# EC2에 SSH 접속
ssh -i ~/.ssh/summy.pem ubuntu@52.78.150.124

# HTTPS 설정 스크립트 실행
curl -fsSL https://raw.githubusercontent.com/FLYLIKEB/ChaLog/main/backend/scripts/setup-https.sh | bash

# 도메인 입력: api.yourdomain.com
# 이메일 입력: your-email@example.com
```

### 3단계: Vercel 환경 변수 변경 (2분)

Vercel 대시보드:
1. Settings → Environment Variables
2. `VITE_API_BASE_URL` 수정
3. Value: `https://api.yourdomain.com`
4. 저장 후 재배포

## ✅ 완료!

이제 `https://cha-log-gilt.vercel.app`에서 Mixed Content 오류가 해결됩니다.

## 문제 발생 시

- [`docs/HTTPS_SETUP_GUIDE.md`](./HTTPS_SETUP_GUIDE.md) - 상세 가이드 참고
- [`docs/HTTPS_SETUP_STEP_BY_STEP.md`](./HTTPS_SETUP_STEP_BY_STEP.md) - 단계별 가이드 참고

