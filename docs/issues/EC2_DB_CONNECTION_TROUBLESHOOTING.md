# EC2에서 DB 연결 문제 해결 가이드

로컬에서는 DB가 잘 불러와지는데 EC2에서만 안 되는 경우의 해결 방법입니다.

## 문제 원인

### 로컬 vs EC2 연결 방식 차이

**로컬 개발 환경:**
- SSH 터널을 통해 EC2를 경유하여 RDS에 연결
- `DATABASE_URL=mysql://admin:password@localhost:3307/chalog`
- 포트 3307은 SSH 터널의 로컬 포트

**EC2 프로덕션 환경:**
- EC2에서 직접 RDS 엔드포인트로 연결
- `DATABASE_URL=mysql://admin:password@rds-endpoint.rds.amazonaws.com:3306/chalog`
- 포트 3306은 RDS의 실제 포트

## 진단 단계

### 1. GitHub Secrets 확인

GitHub 저장소 → Settings → Secrets and variables → Actions

**확인할 Secret:**
- `EC2_DATABASE_URL`: RDS 엔드포인트로 설정되어 있어야 함
  - ✅ 올바른 형식: `mysql://admin:password@your-rds-endpoint.rds.amazonaws.com:3306/chalog`
  - ❌ 잘못된 형식: `mysql://admin:password@localhost:3307/chalog` (로컬 개발용)

### 2. EC2에서 .env 파일 확인

```bash
# EC2에 SSH 접속
ssh -i ~/.ssh/summy.pem ubuntu@your-ec2-ip

# .env 파일 확인
cat /home/ubuntu/chalog-backend/.env

# DATABASE_URL 확인
grep DATABASE_URL /home/ubuntu/chalog-backend/.env
```

**예상되는 올바른 값:**
```env
DATABASE_URL=mysql://admin:password@your-rds-endpoint.rds.amazonaws.com:3306/chalog
```

**잘못된 값 (로컬 개발용):**
```env
DATABASE_URL=mysql://admin:password@localhost:3307/chalog
```

### 3. RDS 보안 그룹 확인

**AWS 콘솔에서 확인:**

1. **RDS 콘솔 접속**
   - AWS Console → RDS → 데이터베이스
   - 해당 RDS 인스턴스 선택

2. **보안 그룹 확인**
   - "연결 및 보안" 탭
   - VPC 보안 그룹 링크 클릭

3. **인바운드 규칙 확인**
   - EC2의 보안 그룹이 허용되어 있는지 확인
   - 또는 EC2의 Private IP가 허용되어 있는지 확인

**필요한 인바운드 규칙:**
```
유형: MySQL/Aurora (3306)
프로토콜: TCP
포트: 3306
소스: 
  - EC2 보안 그룹 선택 (권장)
  - 또는 EC2 Private IP (CIDR 표기법, 예: 10.0.1.100/32)
```

### 4. EC2에서 직접 연결 테스트

```bash
# EC2에 SSH 접속
ssh -i ~/.ssh/summy.pem ubuntu@your-ec2-ip

# MySQL 클라이언트 설치 (없는 경우)
sudo apt-get update
sudo apt-get install -y mysql-client

# RDS 엔드포인트로 직접 연결 테스트
# 실제 RDS 엔드포인트: database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com
export MYSQL_PWD='your-password'  # 비밀번호를 환경 변수로 설정 (보안상 권장)
mysql -h database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com \
      -P 3306 \
      -u admin \
      chalog

# 또는 비밀번호를 직접 입력하는 방법:
# mysql -h database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com \
#       -P 3306 \
#       -u admin \
#       -p \
#       chalog

# 연결 성공 시:
# mysql> SELECT 1;
# mysql> SHOW DATABASES;
# mysql> exit;

# ✅ 테스트 완료: EC2에서 RDS 연결 성공 확인됨
```

**연결 실패 시:**
- 보안 그룹 설정 문제일 가능성이 높음
- RDS 보안 그룹에서 EC2 보안 그룹을 허용해야 함

## 해결 방법

### 방법 1: GitHub Secrets 수정 (권장)

1. **RDS 엔드포인트 확인**
   - AWS Console → RDS → 데이터베이스
   - 해당 RDS 인스턴스 → "연결 및 보안" 탭
   - 엔드포인트 복사 (예: `chalog-db.xxxxx.ap-northeast-2.rds.amazonaws.com`)

2. **GitHub Secrets 수정**
   - GitHub 저장소 → Settings → Secrets and variables → Actions
   - `EC2_DATABASE_URL` Secret 편집
   - 형식: `mysql://admin:password@엔드포인트:3306/chalog`
   - 예: `mysql://admin:MyPassword123@chalog-db.xxxxx.ap-northeast-2.rds.amazonaws.com:3306/chalog`

3. **재배포**
   - GitHub Actions → "Deploy Backend to EC2" 워크플로우
   - "Run workflow" 클릭하여 재배포

### 방법 2: RDS 보안 그룹 수정

1. **EC2 보안 그룹 ID 확인**
   ```bash
   # EC2에 SSH 접속
   ssh -i ~/.ssh/summy.pem ubuntu@your-ec2-ip
   
   # EC2 인스턴스 ID 확인
   curl -s http://169.254.169.254/latest/meta-data/instance-id
   
   # 또는 AWS 콘솔에서:
   # EC2 → Instances → 해당 인스턴스 → 보안 탭 → 보안 그룹 ID 확인
   ```

2. **RDS 보안 그룹 인바운드 규칙 추가**
   - AWS Console → RDS → 데이터베이스
   - 해당 RDS 인스턴스 → "연결 및 보안" 탭
   - VPC 보안 그룹 링크 클릭
   - "인바운드 규칙 편집" 클릭
   - "규칙 추가" 클릭
   - 설정:
     ```
     유형: MySQL/Aurora (3306)
     프로토콜: TCP
     포트: 3306
     소스: EC2 보안 그룹 선택 (드롭다운에서 선택)
     ```
   - "규칙 저장" 클릭

### 방법 3: EC2에서 직접 .env 파일 수정 (임시)

```bash
# EC2에 SSH 접속
ssh -i ~/.ssh/summy.pem ubuntu@your-ec2-ip

# .env 파일 편집
nano /home/ubuntu/chalog-backend/.env

# DATABASE_URL 수정
# localhost:3307 → RDS 엔드포인트:3306

# PM2 재시작
pm2 restart chalog-backend

# 로그 확인
pm2 logs chalog-backend --lines 50
```

## 확인 사항 체크리스트

- [ ] GitHub Secrets의 `EC2_DATABASE_URL`이 RDS 엔드포인트로 설정되어 있음
- [ ] RDS 보안 그룹에서 EC2 보안 그룹이 허용되어 있음
- [ ] EC2에서 직접 RDS로 연결 테스트 성공
- [ ] EC2의 `.env` 파일에 올바른 `DATABASE_URL`이 설정되어 있음
- [ ] PM2 로그에 DB 연결 오류가 없음

## 추가 진단 명령어

### EC2에서 PM2 로그 확인

```bash
# 최근 로그 확인
pm2 logs chalog-backend --lines 100

# 에러만 확인
pm2 logs chalog-backend --err --lines 50

# 실시간 로그
pm2 logs chalog-backend --lines 0
```

### EC2에서 네트워크 연결 테스트

```bash
# RDS 엔드포인트로 포트 연결 테스트
telnet your-rds-endpoint.rds.amazonaws.com 3306

# 또는 nc (netcat) 사용
nc -zv your-rds-endpoint.rds.amazonaws.com 3306
```

### EC2에서 환경 변수 확인

```bash
# PM2로 실행 중인 프로세스의 환경 변수 확인
pm2 env chalog-backend

# 또는 .env 파일 확인
cat /home/ubuntu/chalog-backend/.env
```

## 관련 문서

- [`docs/infrastructure/AWS_RDS_SETUP.md`](../infrastructure/AWS_RDS_SETUP.md) - RDS 설정 가이드
- [`docs/deployment/AWS_EC2_DEPLOYMENT.md`](../deployment/AWS_EC2_DEPLOYMENT.md) - EC2 배포 가이드
- [`docs/infrastructure/DATABASE.md`](../infrastructure/DATABASE.md) - 데이터베이스 설정 가이드

