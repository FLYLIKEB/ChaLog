# 데이터베이스 연결 문제 해결 가이드

ChaLog 프로젝트의 데이터베이스 연결 문제를 진단하고 해결하는 방법입니다.

## 현재 상태

- **RDS 엔드포인트**: `database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com`
- **포트**: `3306`
- **사용자명**: `admin`
- **비밀번호**: `.env` 파일의 `DATABASE_URL`에서 확인
- **SSH 터널**: 로컬 포트 `3307`

## 문제 진단

### 1. SSH 터널 확인

```bash
cd backend
ps aux | grep "ssh.*3307"
```

터널이 없으면:
```bash
./scripts/start-ssh-tunnel.sh
```

### 2. 포트 확인

```bash
lsof -i :3307
```

포트가 열려있어야 합니다.

### 3. SSH 터널을 통한 연결 테스트

```bash
mysql -h localhost -P 3307 -u admin -p
# 비밀번호 입력 (DATABASE_URL에서 확인)
```

### 4. EC2에서 직접 연결 테스트

```bash
ssh -i ~/.ssh/summy.pem ubuntu@52.78.150.124
mysql -h database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com -P 3306 -u admin -p
```

### 5. 직접 RDS 연결 테스트 (보안 그룹 설정 후)

```bash
mysql -h database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com -P 3306 -u admin -p
```

## 일반적인 문제와 해결 방법

### 문제 1: "Access denied for user 'admin'@'localhost'"

**원인:**
- 비밀번호가 잘못됨
- SSH 터널이 제대로 작동하지 않음

**해결 방법:**

1. **비밀번호 확인**
   ```bash
   cd backend
   # DATABASE_URL에서 비밀번호 확인
   grep DATABASE_URL .env
   ```

2. **SSH 터널 재시작**
   ```bash
   ./scripts/stop-ssh-tunnel.sh
   ./scripts/start-ssh-tunnel.sh
   ```

3. **EC2에서 직접 연결 테스트**
   ```bash
   ssh -i ~/.ssh/summy.pem ubuntu@52.78.150.124 \
     "mysql -h database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com -P 3306 -u admin -p"
   ```
   
   EC2에서 연결이 성공하면 비밀번호는 맞는 것입니다.

### 문제 2: "Can't connect to MySQL server" (타임아웃)

**원인:**
- 보안 그룹 설정 문제
- RDS 퍼블릭 액세스 비활성화
- 네트워크 방화벽 문제

**해결 방법:**

1. **보안 그룹 확인**
   ```bash
   aws ec2 describe-security-groups \
     --group-ids sg-01a53d9929d464083 \
     --query "SecurityGroups[0].IpPermissions[?FromPort==\`3306\`]" \
     --output json \
     --region ap-northeast-2
   ```

2. **RDS 퍼블릭 액세스 확인**
   ```bash
   aws rds describe-db-instances \
     --query "DBInstances[?Endpoint.Address=='database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com'].PubliclyAccessible" \
     --output text \
     --region ap-northeast-2
   ```

3. **포트 연결 테스트**
   ```bash
   nc -zv -w 5 database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com 3306
   ```

### 문제 3: SSH 터널이 자동으로 종료됨

**원인:**
- 네트워크 연결 불안정
- EC2 인스턴스 재시작

**해결 방법:**

1. **터널 재시작**
   ```bash
   cd backend
   ./scripts/stop-ssh-tunnel.sh
   ./scripts/start-ssh-tunnel.sh
   ```

2. **터널 상태 모니터링**
   ```bash
   watch -n 5 'ps aux | grep "ssh.*3307" | grep -v grep'
   ```

## 권장 연결 방법

### 방법 1: SSH 터널 사용 (로컬 개발)

**장점:**
- 보안 그룹 설정 불필요
- 안전한 연결

**단점:**
- SSH 터널 관리 필요
- 연결이 불안정할 수 있음

**사용법:**
```bash
cd backend
./scripts/start-ssh-tunnel.sh
mysql -h localhost -P 3307 -u admin -p
```

### 방법 2: 직접 RDS 연결 (보안 그룹 설정 필요)

**장점:**
- SSH 터널 불필요
- 안정적인 연결

**단점:**
- 보안 그룹 설정 필요
- IP 변경 시 규칙 업데이트 필요

**사용법:**
```bash
# 보안 그룹에 IP 추가
cd backend
./scripts/add-rds-security-group-rule.sh sg-01a53d9929d464083

# 직접 연결
mysql -h database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com -P 3306 -u admin -p
```

## SQLTools 연결 설정

### SSH 터널 사용 시

| 항목 | 값 |
|------|-----|
| **Server** | `localhost` |
| **Port** | `3307` |
| **Username** | `admin` |
| **Password** | `.env` 파일의 `DATABASE_URL`에서 확인 |

### 직접 RDS 연결 시

| 항목 | 값 |
|------|-----|
| **Server** | `database-1.cnyqy8snc0sl.ap-northeast-2.rds.amazonaws.com` |
| **Port** | `3306` |
| **Username** | `admin` |
| **Password** | `.env` 파일의 `DATABASE_URL`에서 확인 |

## 추가 리소스

- [데이터베이스 설정 가이드](./DATABASE.md)
- [SQLTools 설정 가이드](./SQLTOOLS_SETUP.md)
- [RDS 보안 그룹 설정](./RDS_SECURITY_GROUP_SETUP.md)

