# SSH 키 인증 문제 해결 가이드

GitHub Actions에서 EC2 배포 시 "Permission denied (publickey)" 오류 해결 방법입니다.

## 문제 진단

### 1. GitHub Secrets 확인

**EC2_SSH_KEY Secret 확인:**

1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. `EC2_SSH_KEY` Secret 클릭
3. **확인 사항:**
   - 첫 줄이 `-----BEGIN RSA PRIVATE KEY-----` 또는 `-----BEGIN OPENSSH PRIVATE KEY-----`로 시작하는가?
   - 마지막 줄이 `-----END RSA PRIVATE KEY-----` 또는 `-----END OPENSSH PRIVATE KEY-----`로 끝나는가?
   - 중간에 줄바꿈이 있는가? (있어야 함)

### 2. SSH 키 형식 확인

로컬에서 SSH 키 확인:

```bash
# SSH 키 파일 확인
cat ~/.ssh/your-key.pem

# 첫 줄 확인
head -1 ~/.ssh/your-key.pem
# 출력: -----BEGIN RSA PRIVATE KEY----- 또는 -----BEGIN OPENSSH PRIVATE KEY-----

# 마지막 줄 확인
tail -1 ~/.ssh/your-key.pem
# 출력: -----END RSA PRIVATE KEY----- 또는 -----END OPENSSH PRIVATE KEY-----

# 줄 수 확인 (일반적으로 20-30줄)
wc -l ~/.ssh/your-key.pem
```

### 3. EC2에서 공개 키 확인

EC2에 SSH 접속하여:

```bash
# authorized_keys 확인
cat ~/.ssh/authorized_keys

# SSH 키 페어의 공개 키 확인 (로컬에서)
ssh-keygen -y -f ~/.ssh/your-key.pem
```

## 해결 방법

### 방법 1: GitHub Secret 재설정 (가장 일반적)

1. **로컬에서 SSH 키 전체 내용 복사**
   ```bash
   # macOS/Linux
   cat ~/.ssh/your-key.pem | pbcopy  # macOS
   cat ~/.ssh/your-key.pem | xclip -selection clipboard  # Linux
   
   # 또는 파일 열어서 전체 선택 후 복사
   cat ~/.ssh/your-key.pem
   ```

2. **GitHub Secret 삭제 후 재생성**
   - Settings → Secrets → `EC2_SSH_KEY` 삭제
   - New repository secret 클릭
   - Name: `EC2_SSH_KEY`
   - Secret: **전체 키 내용 붙여넣기** (줄바꿈 포함)
   - Add secret 클릭

3. **Secret 확인**
   - 저장 후 다시 열어서 첫 줄과 마지막 줄 확인

### 방법 2: EC2에 공개 키 추가

EC2에 SSH 접속하여:

```bash
# authorized_keys 파일 확인
cat ~/.ssh/authorized_keys

# 공개 키 추가 (로컬에서 생성)
# 로컬에서 실행:
ssh-keygen -y -f ~/.ssh/your-key.pem >> ~/.ssh/authorized_keys

# 또는 EC2에서 직접 추가
nano ~/.ssh/authorized_keys
# 공개 키 내용 붙여넣기
```

### 방법 3: SSH 키 형식 변환

만약 OpenSSH 형식이 필요하다면:

```bash
# PEM 형식을 OpenSSH 형식으로 변환
ssh-keygen -p -m PEM -f ~/.ssh/your-key.pem

# 또는 OpenSSH 형식을 PEM 형식으로 변환
ssh-keygen -p -m PEM -f ~/.ssh/your-key.pem
```

### 방법 4: 새 SSH 키 페어 생성

1. **EC2에서 새 키 페어 생성**
   - AWS 콘솔 → EC2 → Key Pairs → Create key pair
   - 이름: `github-actions-deploy`
   - 형식: `.pem` (RSA) 또는 `.ppk` (PuTTY)

2. **EC2 인스턴스에 공개 키 추가**
   ```bash
   # EC2에 SSH 접속 (기존 키로)
   ssh -i ~/.ssh/old-key.pem ubuntu@your-ec2-ip
   
   # 새 공개 키 추가
   echo "새-공개-키-내용" >> ~/.ssh/authorized_keys
   ```

3. **GitHub Secret 업데이트**
   - 새 개인 키로 `EC2_SSH_KEY` 업데이트

## 테스트

### 로컬에서 SSH 연결 테스트

```bash
# SSH 키 권한 설정
chmod 600 ~/.ssh/your-key.pem

# 연결 테스트
ssh -i ~/.ssh/your-key.pem \
    -o StrictHostKeyChecking=no \
    ubuntu@your-ec2-ip \
    "echo '연결 성공!'"
```

### GitHub Actions에서 테스트

워크플로우에 디버그 단계 추가:

```yaml
- name: Test SSH Connection
  run: |
    ssh -i ~/.ssh/deploy_key \
        -v \
        -o StrictHostKeyChecking=no \
        ${{ secrets.EC2_USER }}@${{ secrets.EC2_HOST }} \
        "echo 'SSH 연결 성공!'"
```

## 일반적인 실수

1. **줄바꿈 누락**: Secret에 키를 붙여넣을 때 줄바꿈이 사라짐
2. **공백 추가**: 앞뒤 공백이 추가됨
3. **부분 복사**: 키의 일부만 복사함
4. **잘못된 키**: 다른 키 페어의 키를 사용함
5. **권한 문제**: EC2의 `.ssh` 디렉토리 권한이 잘못됨

## EC2 권한 확인

EC2에서:

```bash
# .ssh 디렉토리 권한
ls -la ~/.ssh
# drwx------ ubuntu ubuntu (700)

# authorized_keys 권한
ls -la ~/.ssh/authorized_keys
# -rw------- ubuntu ubuntu (600)

# 권한 수정 (필요시)
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## 추가 확인 사항

1. **EC2 보안 그룹**
   - SSH (22) 포트가 GitHub Actions IP에서 접근 가능한지 확인
   - 또는 임시로 `0.0.0.0/0` 허용 (테스트용)

2. **EC2 인스턴스 상태**
   - 인스턴스가 실행 중인지 확인
   - Public IP가 올바른지 확인

3. **네트워크 ACL**
   - VPC의 네트워크 ACL이 SSH 트래픽을 허용하는지 확인

## 여전히 문제가 있다면

1. GitHub Actions 로그에서 상세한 오류 메시지 확인
2. EC2 시스템 로그 확인: `/var/log/auth.log`
3. SSH 연결을 `-v` 옵션으로 상세 로그 확인

