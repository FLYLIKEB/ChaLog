# Proxy Network Error (fetch failed) 해결 가이드

Vercel 프록시에서 `fetch failed`, `isNetworkError: true` 오류가 발생할 때의 해결 방법입니다.

## 증상

```
[Proxy] ❌ Error: {
  requestId: '...',
  backendUrl: 'http://YOUR_LIGHTSAIL_IP:3000/api/teas',
  method: 'GET',
  path: 'teas',
  errorName: 'TypeError',
  errorMessage: 'fetch failed',
  isAbortError: false,
  isNetworkError: true
}
```

## 원인

Vercel 서버리스 함수가 백엔드 서버(`YOUR_LIGHTSAIL_IP`)에 **TCP 연결을 할 수 없음**을 의미합니다.

## 해결 방법

### 1. BACKEND_URL을 포트 80으로 변경 (가장 흔한 원인)

**Nginx를 사용하는 경우**, 외부에는 **포트 80**만 열려 있고, 포트 3000은 localhost에서만 사용됩니다.

| 현재 (잘못된 설정) | 수정 (올바른 설정) |
|-------------------|-------------------|
| `http://YOUR_LIGHTSAIL_IP:3000` | `http://YOUR_LIGHTSAIL_IP` |

**Vercel 대시보드에서 수정:**
1. Project → **Settings** → **Environment Variables**
2. `BACKEND_URL` 값을 `http://YOUR_LIGHTSAIL_IP`로 변경 (포트 번호 제거)
3. **Redeploy** 실행

### 2. 방화벽에서 포트 3000 허용 (포트 3000 직접 사용 시)

포트 3000을 직접 노출하려면 **AWS Security Group** 또는 **Lightsail 방화벽**에서 허용해야 합니다.

#### Lightsail
1. [Lightsail 콘솔](https://lightsail.aws.amazon.com/) → 인스턴스 선택
2. **네트워킹(Networking)** 탭 → **방화벽**
3. **규칙 추가**:
   - 애플리케이션: **Custom**
   - 프로토콜: **TCP**
   - 포트: **3000**
   - 소스: **Anywhere (0.0.0.0/0)**

#### Lightsail 방화벽
1. Lightsail 콘솔 → 인스턴스 → 네트워킹 탭
2. **Inbound rules** → **Edit** → **Add rule**
   - Type: Custom TCP
   - Port: 3000
   - Source: 0.0.0.0/0 (또는 Vercel IP 대역)

### 3. 백엔드 서버 실행 확인

Lightsail에 SSH 접속 후:

```bash
# PM2 상태 확인
pm2 status

# 백엔드가 중지되어 있으면 재시작
pm2 restart chalog-backend

# 로그 확인
pm2 logs chalog-backend --lines 50
```

### 4. 로컬에서 연결 테스트

```bash
# 포트 80 (Nginx 경유) - Nginx 사용 시
curl -v http://YOUR_LIGHTSAIL_IP/api/teas

# 포트 3000 (직접) - 방화벽에서 3000 허용한 경우
curl -v http://YOUR_LIGHTSAIL_IP:3000/api/teas
```

- 포트 80만 응답하면 → `BACKEND_URL`을 `http://YOUR_LIGHTSAIL_IP`로 설정
- 포트 3000도 응답하면 → `BACKEND_URL`을 `http://YOUR_LIGHTSAIL_IP:3000`로 설정 가능 (방화벽 확인)

### 5. IP 주소 변경 여부 확인

Lightsail 인스턴스를 재시작하면 **퍼블릭 IP가 바뀔 수 있습니다**. 고정 IP를 사용하지 않았다면:

1. AWS 콘솔에서 현재 퍼블릭 IP 확인
2. Vercel `BACKEND_URL` 환경 변수를 새 IP로 업데이트

## 체크리스트

- [ ] Nginx 사용 시: `BACKEND_URL=http://YOUR_LIGHTSAIL_IP` (포트 80)
- [ ] 포트 3000 직접 사용 시: 방화벽에서 3000 허용
- [ ] PM2로 백엔드 프로세스 실행 중
- [ ] `curl`로 해당 주소에서 API 응답 확인
- [ ] Vercel 환경 변수 변경 후 Redeploy
