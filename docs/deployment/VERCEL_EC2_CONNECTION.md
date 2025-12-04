# Vercel에서 EC2 백엔드 연결 문제 해결

Vercel Serverless Function에서 EC2 백엔드로의 연결이 실패하는 경우의 해결 방법입니다.

## 문제 증상

- Vercel 프록시 함수에서 `fetch failed` 오류 발생
- 에러 메시지: `TypeError: fetch failed`
- 로컬에서는 `curl`로 접근 가능하지만 Vercel에서는 실패

## 원인

Vercel Serverless Function은 특정 네트워크 환경에서 실행되며, EC2의 보안 그룹이 Vercel의 IP를 허용하지 않을 수 있습니다.

## 해결 방법

### 1. EC2 보안 그룹 확인 및 수정

**AWS 콘솔에서 확인:**

1. **EC2 콘솔 접속**
   - AWS Console → EC2 → Instances
   - 해당 EC2 인스턴스 선택

2. **보안 그룹 확인**
   - "보안" 탭 → 보안 그룹 링크 클릭

3. **인바운드 규칙 확인**
   - 포트 3000이 외부 접근을 허용하는지 확인

**필요한 인바운드 규칙:**

```
유형: 사용자 지정 TCP
프로토콜: TCP
포트: 3000
소스: 0.0.0.0/0 (모든 IP 허용)
설명: Vercel 프록시 접근 허용
```

**규칙 추가 방법:**

1. 보안 그룹 선택 → "인바운드 규칙 편집" 클릭
2. "규칙 추가" 클릭
3. 위 설정 입력
4. "규칙 저장" 클릭

### 2. Vercel 환경 변수 확인

Vercel 대시보드 → Settings → Environment Variables에서 확인:

- `BACKEND_URL`: `http://52.78.150.124:3000` (올바른 형식)
- `BACKEND_TIMEOUT_MS`: `30000` (30초, 선택사항)

### 3. 네트워크 연결 테스트

**로컬에서 테스트:**
```bash
curl -v http://52.78.150.124:3000/health
```

**Vercel 함수에서 테스트:**
```bash
curl https://cha-log-gilt.vercel.app/api/test
```

## 확인 사항 체크리스트

- [ ] EC2 보안 그룹에서 포트 3000이 0.0.0.0/0으로 허용됨
- [ ] Vercel 환경 변수 `BACKEND_URL`이 올바르게 설정됨
- [ ] 로컬에서 `curl`로 EC2 접근 가능
- [ ] EC2 백엔드 서버가 정상 실행 중 (PM2 상태 확인)

## 추가 진단

### EC2에서 포트 확인

```bash
# EC2에 SSH 접속
ssh -i ~/.ssh/summy.pem ubuntu@52.78.150.124

# 포트 3000 리스닝 확인
sudo netstat -tlnp | grep 3000

# 또는
sudo ss -tlnp | grep 3000
```

### PM2 상태 확인

```bash
pm2 status
pm2 logs chalog-backend --lines 50
```

## 참고

- Vercel Serverless Function은 동적 IP를 사용하므로, EC2 보안 그룹에서 특정 IP를 허용하는 것은 불가능합니다.
- 따라서 포트 3000을 0.0.0.0/0으로 열어야 합니다.
- 보안상 우려가 있다면, Nginx를 통해 HTTPS를 설정하고 포트 443만 열어두는 것을 권장합니다.

