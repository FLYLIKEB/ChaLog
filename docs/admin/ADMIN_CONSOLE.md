# ChaLog 운영자 콘솔 가이드

## 개요

운영자 콘솔은 ChaLog 서비스의 콘텐츠 품질과 커뮤니티 안전을 담당하는 운영자 전용 관리 도구입니다.

## 접근 방법

- **URL**: `/admin` (예: `https://your-domain.com/admin`)
- **인증**: 일반 앱과 동일한 JWT 로그인. `User.role === 'admin'`인 사용자만 접근 가능합니다.
- **접근 제한**: `AdminRouteGuard`가 role을 검사하여 비운영자 접근 시 거부합니다.

## 환경 변수

| 변수명 | 설명 | 참고 |
|--------|------|------|
| `ADMIN_USER_IDS` | 초기 운영자로 지정할 사용자 ID (쉼표 구분) | 마이그레이션 실행 시 적용. 상세: [ENVIRONMENT_VARIABLES.md](../configuration/ENVIRONMENT_VARIABLES.md) |

## 기능별 가이드

### 대시보드 (`/admin`)

- 핵심 지표: 총 사용자 수, 차록 수, 게시글 수, 차 수
- 미처리 신고 수 및 최근 신고 요약
- 신고 추이 차트, 최근 가입자 등

### 신고 관리 (`/admin/reports`)

- 차록 신고 / 게시글 신고 탭 분리
- 필터: 상태(pending/dismissed/acted), 신고 사유, 기간
- 무시(dismiss), 조치(action) 처리

### 사용자 (`/admin/users`, `/admin/users/:id`)

- 사용자 검색, 목록, 상세
- 프로필 수정(이름, bio, 링크 등)
- 계정 정지, 운영자 승격, 계정 삭제

### 차록 (`/admin/notes`)

- 차록 검색, 목록, 상세
- 강제 삭제

### 게시글 (`/admin/posts`)

- 게시글 검색, 목록, 상세
- 고정/삭제, 댓글 삭제

### 마스터 데이터 (`/admin/master`)

차(Tea), 찻집(Seller), 태그(Tag), 사용자(User)를 관리합니다.

| 탭 | 기능 |
|----|------|
| **차(Tea)** | 목록/검색, 추가, 수정, 삭제, 병합 |
| **찻집(Seller)** | 목록/검색, 추가, 수정, 삭제, 병합 |
| **태그(Tag)** | 목록/검색/정렬, 추가, 수정, 삭제, 병합 |
| **사용자(User)** | 목록/검색, 상세 링크(프로필 수정·정지·승격·삭제) |

### 모니터링 (`/admin/monitoring`)

- 서버 메트릭, 로그 조회
- 로그 레벨 필터(전체/에러/경고)

### 감사 로그 (`/admin/audit`)

- 운영자가 수행한 삭제, 조치, 수정 등 이력 조회

## 아키텍처 참고

- 프론트엔드 라우트: [architecture.md](../architecture/architecture.md#운영자-콘솔-admin)
- 백엔드 API: [SERVER_ARCHITECTURE.md](../architecture/SERVER_ARCHITECTURE.md)
