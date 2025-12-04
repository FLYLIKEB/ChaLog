# AWS S3 설정 가이드

이 문서는 ChaLog 백엔드에서 이미지 업로드를 위한 AWS S3 설정 단계별 가이드를 제공합니다.

## 목차

1. [S3 버킷 생성](#1-s3-버킷-생성)
2. [IAM 사용자 생성 및 권한 설정](#2-iam-사용자-생성-및-권한-설정)
3. [버킷 정책 설정](#3-버킷-정책-설정)
4. [CORS 설정](#4-cors-설정)
5. [환경 변수 설정](#5-환경-변수-설정)
6. [로컬 개발 환경 설정 (선택사항)](#6-로컬-개발-환경-설정-선택사항)
7. [테스트 및 확인](#7-테스트-및-확인)

## 1. S3 버킷 생성

### AWS 콘솔에서 버킷 생성

1. **AWS 콘솔 접속**
   - AWS Management Console → S3 서비스로 이동

2. **버킷 생성**
   - "버킷 만들기" 버튼 클릭

3. **일반 설정**
   ```text
   버킷 이름: chalog-images (또는 원하는 이름)
   AWS 리전: ap-northeast-2 (서울)
   ```
   
   **주의**: 버킷 이름은 전 세계적으로 고유해야 합니다.

4. **객체 소유권 설정**
   - "ACL 활성화됨" 선택
   - "버킷 소유자에게 적용된 ACL" 선택

5. **퍼블릭 액세스 차단 설정**
   - "모든 퍼블릭 액세스 차단" 설정을 **해제**해야 합니다
   - ✅ "새 퍼블릭 버킷 정책을 통해 부여된 퍼블릭 액세스 차단" 해제
   - ✅ "모든 퍼블릭 액세스 차단" 해제
   
   **주의**: 이미지가 공개적으로 접근 가능해야 하므로 퍼블릭 액세스를 허용해야 합니다.

6. **버킷 버전 관리**
   - 버전 관리: 비활성화 (기본값)

7. **기본 암호화**
   - 암호화 유형: Amazon S3 관리형 키(SSE-S3) (기본값)

8. **고급 설정**
   - 객체 잠금: 비활성화 (기본값)

9. **생성 완료**
   - "버킷 만들기" 클릭

## 2. IAM 사용자 생성 및 권한 설정

### IAM 사용자 생성

1. **IAM 콘솔 접속**
   - AWS Management Console → IAM 서비스로 이동

2. **사용자 생성**
   - "사용자" 메뉴 → "사용자 추가" 클릭

3. **사용자 세부 정보**
   ```text
   사용자 이름: chalog-s3-user (또는 원하는 이름)
   AWS 자격 증명 유형: 액세스 키 - 프로그래밍 방식 액세스
   ```

4. **권한 설정**
   - "기존 정책 직접 연결" 선택
   - 다음 정책 검색 및 선택:
     - `AmazonS3FullAccess` (또는 더 제한적인 커스텀 정책 사용 권장)

   **권장: 커스텀 정책 생성**
   
   더 안전한 방법은 특정 버킷에만 접근할 수 있는 커스텀 정책을 만드는 것입니다:
   
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:PutObjectAcl"
         ],
         "Resource": "arn:aws:s3:::chalog-images/*"
       },
       {
         "Effect": "Allow",
         "Action": [
           "s3:ListBucket"
         ],
         "Resource": "arn:aws:s3:::chalog-images"
       }
     ]
   }
   ```
   
   이 정책을 생성한 후 사용자에 연결합니다.

5. **액세스 키 생성**
   - 사용자 생성 완료 후 "액세스 키 ID"와 "비밀 액세스 키"를 안전하게 저장
   - **중요**: 비밀 액세스 키는 한 번만 표시되므로 반드시 저장하세요!

## 3. 버킷 정책 설정

### 퍼블릭 읽기 액세스 허용

S3 버킷에서 이미지를 공개적으로 읽을 수 있도록 버킷 정책을 설정합니다.

1. **S3 콘솔에서 버킷 선택**
   - 생성한 버킷(`chalog-images`) 클릭

2. **권한 탭으로 이동**
   - "권한" 탭 클릭

3. **버킷 정책 편집**
   - "버킷 정책" 섹션 → "편집" 클릭
   - 다음 정책을 추가:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::chalog-images/*"
       }
     ]
   }
   ```
   
   **주의**: `chalog-images`를 실제 버킷 이름으로 변경하세요.

4. **정책 저장**
   - "변경 사항 저장" 클릭

## 4. CORS 설정

프론트엔드에서 직접 S3에 접근하는 경우 CORS 설정이 필요할 수 있습니다. 현재는 백엔드를 통해 업로드하므로 선택사항입니다.

### CORS 설정 (선택사항)

1. **S3 콘솔에서 버킷 선택**
   - 생성한 버킷 클릭

2. **권한 탭으로 이동**
   - "권한" 탭 클릭

3. **CORS 설정**
   - "교차 출처 리소스 공유(CORS)" 섹션 → "편집" 클릭
   - 다음 설정 추가:

   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": [
         "https://cha-log-gilt.vercel.app",
         "http://localhost:5173"
       ],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

4. **설정 저장**
   - "변경 사항 저장" 클릭

## 5. 환경 변수 설정

### 백엔드 환경 변수

`backend/.env` 파일에 다음 환경 변수를 추가합니다:

```env
# AWS S3 설정
AWS_REGION=ap-northeast-2
AWS_S3_BUCKET_NAME=chalog-images
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=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
```

**실제 값으로 변경**:
- `AWS_REGION`: 버킷을 생성한 리전 (예: `ap-northeast-2`)
- `AWS_S3_BUCKET_NAME`: 생성한 버킷 이름
- `AWS_ACCESS_KEY_ID`: IAM 사용자의 액세스 키 ID
- `AWS_SECRET_ACCESS_KEY`: IAM 사용자의 비밀 액세스 키

### 로컬 개발 환경 (선택사항)

로컬 개발 환경에서 MinIO 등을 사용하는 경우:

```env
AWS_S3_ENDPOINT=http://localhost:9000
```

이 경우 `AWS_ACCESS_KEY_ID`와 `AWS_SECRET_ACCESS_KEY`는 MinIO 설정에 맞게 설정합니다.

### 프로덕션 환경 (EC2)

EC2 서버의 `/home/ubuntu/chalog-backend/.env` 파일에 동일한 환경 변수를 추가합니다.

**GitHub Secrets에 추가** (자동 배포 사용 시):

GitHub 저장소 → Settings → Secrets and variables → Actions에서 다음 Secrets 추가:

- `EC2_AWS_REGION`: `ap-northeast-2`
- `EC2_AWS_S3_BUCKET_NAME`: `chalog-images`
- `EC2_AWS_ACCESS_KEY_ID`: IAM 사용자의 액세스 키 ID
- `EC2_AWS_SECRET_ACCESS_KEY`: IAM 사용자의 비밀 액세스 키

그리고 GitHub Actions 워크플로우에서 `.env` 파일 생성 시 이 변수들을 포함하도록 수정해야 합니다.

## 6. 로컬 개발 환경 설정 (선택사항)

로컬 개발 환경에서 AWS S3 대신 MinIO를 사용할 수 있습니다.

### MinIO 설치 및 실행

```bash
# Docker를 사용한 MinIO 실행
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

### MinIO 버킷 생성

1. 브라우저에서 `http://localhost:9001` 접속
2. 로그인: `minioadmin` / `minioadmin`
3. 버킷 생성: `chalog-images`
4. 버킷 정책 설정: Public (읽기 전용)

### 환경 변수 설정

```env
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=chalog-images
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_ENDPOINT=http://localhost:9000
```

## 7. 테스트 및 확인

### 백엔드 서버 재시작

환경 변수를 설정한 후 백엔드 서버를 재시작합니다:

```bash
# 로컬 개발 환경
cd backend
npm run start:dev

# 프로덕션 환경 (EC2)
pm2 restart chalog-backend
```

### 이미지 업로드 테스트

1. **API 엔드포인트 확인**
   - `POST /notes/images`
   - 인증 토큰 필요 (JWT)

2. **cURL로 테스트**
   ```bash
   curl -X POST http://localhost:3000/notes/images \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "image=@/path/to/test-image.jpg"
   ```

3. **응답 확인**
   ```json
   {
     "url": "https://chalog-images.s3.ap-northeast-2.amazonaws.com/notes/1234567890-abc123.jpg"
   }
   ```

4. **S3 콘솔에서 확인**
   - S3 콘솔 → 버킷 → 업로드된 파일 확인
   - 파일 URL로 직접 접근 가능한지 확인

### 문제 해결

#### "AWS_S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다" 오류

- `.env` 파일에 `AWS_S3_BUCKET_NAME`이 설정되어 있는지 확인
- 서버 재시작 확인

#### "Access Denied" 오류

- IAM 사용자 권한 확인
- 버킷 정책 확인
- 액세스 키 ID와 비밀 액세스 키가 올바른지 확인

#### 이미지가 공개적으로 접근되지 않음

- 버킷 정책에서 `s3:GetObject` 권한 확인
- 버킷의 "퍼블릭 액세스 차단" 설정 확인
- 객체의 ACL이 `public-read`로 설정되어 있는지 확인

#### CORS 오류 (프론트엔드에서 직접 접근 시)

- CORS 설정 확인
- AllowedOrigins에 프론트엔드 도메인 포함 확인

## 비용 최적화

### S3 비용 절감 팁

1. **생명주기 정책 설정**
   - 오래된 이미지 자동 삭제 또는 Glacier로 이동
   - S3 콘솔 → 버킷 → 관리 → 생명주기 규칙

2. **CloudFront 사용** (선택사항)
   - CDN을 통해 전송 비용 절감
   - 전 세계 사용자에게 빠른 이미지 제공

3. **이미지 최적화**
   - 현재 코드에서 이미지 리사이징 및 최적화 수행 중
   - Sharp 라이브러리를 통해 자동 최적화

## 보안 고려사항

1. **IAM 권한 최소화**
   - 필요한 최소 권한만 부여
   - 커스텀 정책 사용 권장

2. **액세스 키 보안**
   - 액세스 키를 코드에 하드코딩하지 않음
   - 환경 변수로 관리
   - 정기적으로 키 로테이션

3. **버킷 정책 검토**
   - 필요한 경우에만 퍼블릭 액세스 허용
   - IP 제한 등 추가 보안 설정 고려

## 관련 문서

- [`docs/configuration/ENVIRONMENT_VARIABLES.md`](../configuration/ENVIRONMENT_VARIABLES.md) - 환경 변수 관리 가이드
- [`docs/infrastructure/AWS_RDS_SETUP.md`](./AWS_RDS_SETUP.md) - AWS RDS 설정 가이드
- [`docs/deployment/AWS_EC2_DEPLOYMENT.md`](../deployment/AWS_EC2_DEPLOYMENT.md) - EC2 배포 가이드

