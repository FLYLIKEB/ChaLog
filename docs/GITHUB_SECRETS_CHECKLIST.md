# GitHub Secrets 설정 체크리스트

GitHub Actions 자동 배포를 위해 다음 Secrets를 반드시 설정해야 합니다.

## 필수 Secrets

### 1. EC2_SSH_KEY ⚠️ 가장 중요

**설정 방법:**
1. 로컬에서 SSH 키 파일 열기:
   ```bash
   cat ~/.ssh/your-key.pem
   ```

2. **전체 내용 복사** (줄바꿈 포함):
   - `-----BEGIN RSA PRIVATE KEY-----` 부터 시작
   - `-----END RSA PRIVATE KEY-----` 까지 끝
   - 중간의 모든 줄 포함

3. GitHub 저장소 → Settings → Secrets and variables → Actions
4. New repository secret 클릭
5. Name: `EC2_SSH_KEY`
6. Secret: 복사한 전체 키 내용 붙여넣기
7. Add secret 클릭

**확인 방법:**
- Secret 저장 후 다시 열어서 첫 줄이 `-----BEGIN`로 시작하는지 확인
- 마지막 줄이 `-----END`로 끝나는지 확인

### 2. EC2_HOST

**설정 방법:**
1. AWS 콘솔 → EC2 → Instances
2. 인스턴스 선택 → Public IPv4 address 복사
3. GitHub Secrets에 추가:
   - Name: `EC2_HOST`
   - Secret: 예) `54.123.45.67` 또는 `api.yourdomain.com`

### 3. EC2_USER ⚠️ 중요

**설정 방법:**
1. GitHub Secrets에 추가:
   - Name: `EC2_USER` (정확히 이 이름으로)
   - Secret: `ubuntu` (Ubuntu 인스턴스인 경우)
   - 또는 `ec2-user` (Amazon Linux인 경우)

**주의사항:**
- Secret 값에 공백이나 줄바꿈이 없어야 합니다
- 정확히 `ubuntu` 또는 `ec2-user`만 입력하세요

## 설정 확인

모든 Secrets를 설정한 후:

1. GitHub 저장소 → Actions 탭
2. "Deploy Backend to EC2" 워크플로우 클릭
3. "Run workflow" 클릭하여 수동 실행
4. 로그에서 "환경 변수 확인" 단계 확인:
   - 모든 변수가 "설정됨"으로 표시되어야 함

## 문제 해결

### "usage: ssh" 오류

이는 SSH 명령어의 변수가 비어있을 때 발생합니다.

**해결:**
1. GitHub Secrets가 올바르게 설정되었는지 확인
2. Secret 이름이 정확한지 확인 (대소문자 구분)
3. Secret 값에 공백이나 특수문자가 없는지 확인

### "Permission denied (publickey)" 오류

**해결:**
- `docs/SSH_KEY_TROUBLESHOOTING.md` 참고

## 빠른 확인 명령어

로컬에서 SSH 연결 테스트:

```bash
# SSH 키 권한 설정
chmod 600 ~/.ssh/your-key.pem

# 연결 테스트
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip "echo '연결 성공!'"
```

이 명령어가 성공하면 GitHub Actions에서도 성공할 가능성이 높습니다.

