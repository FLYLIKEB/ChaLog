# AWS RDS/Aurora MySQL 설정 가이드

이 문서는 ChaLog 백엔드에서 AWS RDS 또는 Aurora MySQL을 원격 데이터베이스로 사용하기 위한 단계별 가이드를 제공합니다.

## 1. AWS RDS/Aurora 인스턴스 생성

### RDS MySQL 인스턴스 생성

1. **AWS 콘솔 접속**
   - AWS Management Console → RDS 서비스로 이동

2. **데이터베이스 생성**
   - "데이터베이스 생성" 버튼 클릭
   - 엔진 선택: **MySQL** 또는 **Aurora MySQL**
   - 버전: MySQL 8.0 이상 권장

3. **템플릿 선택**
   - 프로덕션: Production
   - 개발/테스트: Dev/Test

4. **설정 구성**
   ```
   DB 인스턴스 식별자: chalog-db (또는 원하는 이름)
   마스터 사용자 이름: admin (또는 원하는 사용자명)
   마스터 암호: 강력한 비밀번호 설정
   ```

5. **인스턴스 크기**
   - 개발: db.t3.micro 또는 db.t3.small
   - 프로덕션: 요구사항에 맞게 선택

6. **스토리지**
   - 자동 스토리지 확장 활성화 권장
   - 할당된 스토리지: 최소 20GB

7. **연결 설정**
   - VPC: 기본 VPC 또는 기존 VPC 선택
   - 퍼블릭 액세스: **예** (외부에서 접근 필요시)
   - VPC 보안 그룹: 새로 생성 또는 기존 그룹 선택
   - 가용 영역: 기본값 또는 특정 영역 선택
   - 데이터베이스 포트: **3306** (기본값)

8. **데이터베이스 인증**
   - 암호 인증: MySQL 네이티브 암호 인증 (기본값)

9. **추가 구성**
   - 초기 데이터베이스 이름: `chalog`
   - 백업 보존 기간: 7일 (프로덕션 권장)
   - 백업 윈도우: 기본값 또는 설정
   - 암호화: 활성화 권장 (프로덕션)

10. **생성 완료**
    - "데이터베이스 생성" 클릭
    - 생성 완료까지 5-10분 소요

## 2. 보안 그룹 설정

RDS 인스턴스에 접근하기 위해 보안 그룹 인바운드 규칙을 설정해야 합니다.

### 보안 그룹 인바운드 규칙 추가

1. **RDS 콘솔에서 보안 그룹 확인**
   - 생성된 RDS 인스턴스 → "연결 및 보안" 탭
   - VPC 보안 그룹 링크 클릭

2. **인바운드 규칙 편집**
   - "인바운드 규칙 편집" 클릭
   - "규칙 추가" 클릭

3. **규칙 설정**
   ```
   유형: MySQL/Aurora (3306)
   프로토콜: TCP
   포트: 3306
   소스: 
     - 특정 IP: 개발자 IP 주소 (CIDR 표기법, 예: 123.456.789.0/32)
     - 또는 EC2 인스턴스: EC2 보안 그룹 선택
     - 또는 모든 IP: 0.0.0.0/0 (보안상 권장하지 않음)
   ```

4. **규칙 저장**

## 3. 엔드포인트 확인

RDS 인스턴스 생성 완료 후 엔드포인트를 확인합니다.

1. **RDS 콘솔**
   - 데이터베이스 → 생성된 인스턴스 선택
   - "연결 및 보안" 탭
   - **엔드포인트** 복사 (예: `chalog-db.xxxxx.ap-northeast-2.rds.amazonaws.com`)
   - **포트**: 3306 (기본값)

## 4. 데이터베이스 초기화

### MySQL 클라이언트로 연결 테스트

```bash
# 로컬에서 MySQL 클라이언트 설치 필요
mysql -h <엔드포인트> -P 3306 -u <마스터사용자명> -p

# 연결 후 데이터베이스 확인
SHOW DATABASES;

# 데이터베이스가 없다면 생성
CREATE DATABASE chalog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 또는 AWS RDS 콘솔에서

- RDS 인스턴스 생성 시 "초기 데이터베이스 이름"에 `chalog` 입력하면 자동 생성됨

## 5. 환경 변수 설정

백엔드 `.env` 파일을 업데이트합니다.

```env
# AWS RDS/Aurora MySQL 연결
DATABASE_URL=mysql://<마스터사용자명>:<비밀번호>@<엔드포인트>:3306/chalog

# 예시:
# DATABASE_URL=mysql://admin:MySecurePassword123@chalog-db.xxxxx.ap-northeast-2.rds.amazonaws.com:3306/chalog

# 개발 환경에서만 true로 설정 (데이터 손실 위험 있음)
DB_SYNCHRONIZE=false

# SSL 연결 사용 여부 (선택사항, 권장)
DB_SSL_ENABLED=true

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=production

# Frontend
FRONTEND_URL=https://your-frontend-domain.com
```

## 6. SSL 연결 설정 (선택사항, 권장)

프로덕션 환경에서는 SSL 연결을 사용하는 것이 권장됩니다.

### RDS CA 인증서 다운로드

```bash
# AWS RDS 글로벌 CA 인증서 다운로드
curl -o rds-ca-2019-root.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
```

### TypeORM 설정에 SSL 옵션 추가

`backend/src/database/typeorm.config.ts` 파일이 이미 SSL 옵션을 지원하도록 업데이트되어 있습니다.

환경 변수에서 `DB_SSL_ENABLED=true`로 설정하면 자동으로 SSL 연결이 활성화됩니다.

## 7. 연결 테스트

### 백엔드 애플리케이션 실행

```bash
cd backend
npm install
npm run start:dev
```

### 연결 확인

- 애플리케이션이 정상적으로 시작되면 연결 성공
- 에러 발생 시 다음 사항 확인:
  1. 보안 그룹 인바운드 규칙 확인
  2. 엔드포인트 주소 확인
  3. 사용자명/비밀번호 확인
  4. 데이터베이스 이름 확인
  5. 네트워크 연결 확인 (방화벽, VPN 등)

## 8. 모니터링 및 최적화

### CloudWatch 모니터링

- RDS 콘솔 → 모니터링 탭에서 다음 메트릭 확인:
  - CPU 사용률
  - 메모리 사용률
  - 연결 수
  - 읽기/쓰기 IOPS
  - 네트워크 처리량

### 성능 최적화

1. **연결 풀 설정**
   - TypeORM의 `extra` 옵션으로 연결 풀 크기 조정
   - 기본값: 최대 10개 연결

2. **읽기 전용 복제본** (Aurora 권장)
   - 읽기 작업이 많은 경우 읽기 전용 복제본 생성
   - 애플리케이션에서 읽기/쓰기 분리

3. **파라미터 그룹**
   - RDS 파라미터 그룹에서 MySQL 설정 최적화
   - 예: `max_connections`, `innodb_buffer_pool_size` 등

## 9. 비용 최적화

### 개발 환경

- **RDS MySQL**: db.t3.micro (프리티어 가능)
- **Aurora Serverless v2**: 사용한 만큼만 과금

### 프로덕션 환경

- **예약 인스턴스**: 장기 사용 시 최대 72% 할인
- **스토리지 자동 확장**: 필요시에만 확장
- **백업 보존 기간**: 요구사항에 맞게 조정

## 10. 보안 모범 사례

1. ✅ **강력한 마스터 비밀번호** 사용
2. ✅ **SSL/TLS 연결** 활성화
3. ✅ **보안 그룹** 최소 권한 원칙 적용
4. ✅ **정기적인 백업** 설정
5. ✅ **암호화** 활성화 (프로덕션)
6. ✅ **IAM 데이터베이스 인증** 고려 (고급)
7. ✅ **VPC 내부 배치** (가능한 경우)
8. ✅ **정기적인 보안 업데이트** 적용

## 문제 해결

### 연결 타임아웃

- 보안 그룹 인바운드 규칙 확인
- RDS 인스턴스가 퍼블릭 액세스 가능한지 확인
- 네트워크 연결 확인 (방화벽, VPN)

### 인증 실패

- 사용자명/비밀번호 확인
- 호스트 기반 접근 권한 확인

### SSL 연결 오류

- CA 인증서 경로 확인
- `DB_SSL_ENABLED=false`로 임시 비활성화하여 테스트

## 참고 자료

- [AWS RDS MySQL 문서](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html)
- [AWS Aurora MySQL 문서](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMySQL.html)
- [TypeORM MySQL 문서](https://typeorm.io/data-source-options#mysql--mariadb-data-source-options)

