# 백엔드 테스트 코드 분석 (SOLID & 클린코드 관점)

## 현재 상태 분석

### 발견된 문제점

#### 1. 코드 중복 (DRY 위반)

**문제:**
- 사용자 등록/로그인/프로필 조회 로직이 여러 테스트 그룹에서 반복됨
- 이메일 생성 로직 (`uniqueEmail = \`test-${Date.now()}@example.com\``) 중복
- 인증 토큰 획득 로직 중복
- 테스트 데이터 생성 로직 중복

**예시:**
```typescript
// /teas 테스트 그룹
uniqueEmail = `teatest-${Date.now()}@example.com`;
await request(app.getHttpServer()).post('/auth/register')...
const loginResponse = await request(app.getHttpServer()).post('/auth/login')...
authToken = loginResponse.body.access_token;
const profileResponse = await request(app.getHttpServer()).post('/auth/profile')...
userId = profileResponse.body.userId;

// /notes/:id/like 테스트 그룹 (동일한 패턴 반복)
const uniqueEmail1 = `likeuser1-${Date.now()}@example.com`;
// ... 동일한 로직 반복
```

**영향:**
- 코드 유지보수 어려움
- 버그 수정 시 여러 곳 수정 필요
- 테스트 코드 가독성 저하

#### 2. 단일 책임 원칙 (SRP) 위반

**문제:**
- `beforeAll` 블록이 너무 많은 책임을 가짐:
  - 사용자 등록
  - 로그인
  - 프로필 조회
  - 차 생성
  - 노트 생성
  - 등등...

**예시:**
```typescript
beforeAll(async () => {
  // 사용자 등록
  // 로그인
  // 프로필 조회
  // 차 생성
  // 노트 생성
  // ... 너무 많은 일을 함
});
```

**영향:**
- 테스트 실패 시 원인 파악 어려움
- 테스트 간 의존성 증가
- 재사용 불가능

#### 3. 테스트 헬퍼 함수 부재

**문제:**
- 공통 로직을 헬퍼 함수로 추출하지 않음
- 테스트 유틸리티가 없음

**필요한 헬퍼 함수:**
- `createTestUser()` - 사용자 생성 및 토큰 반환
- `createTestTea()` - 차 생성
- `createTestNote()` - 노트 생성
- `getAuthHeaders()` - 인증 헤더 생성
- `generateUniqueEmail()` - 고유 이메일 생성

#### 4. 매직 넘버/문자열

**문제:**
- 하드코딩된 값들이 많음
- 의미가 불명확한 값들

**예시:**
```typescript
password: 'password123'  // 여러 곳에서 반복
email: `test-${Date.now()}@example.com`  // 패턴 반복
```

#### 5. 테스트 데이터 정리 로직 중복

**문제:**
- 각 테스트 그룹마다 유사한 정리 로직 반복
- `beforeEach`에서 유사한 DELETE 쿼리 반복

#### 6. 타입 안정성 부족

**문제:**
- 테스트 응답 타입이 명시되지 않음
- `any` 타입 사용 가능성

## 개선 제안

### 1. 테스트 헬퍼 모듈 생성

**파일:** `backend/test/helpers/test-helpers.ts`

```typescript
export interface TestUser {
  id: number;
  email: string;
  name: string;
  token: string;
}

export interface TestTea {
  id: number;
  name: string;
  // ...
}

export interface TestNote {
  id: number;
  teaId: number;
  userId: number;
  // ...
}

export class TestHelper {
  constructor(
    private readonly app: INestApplication,
    private readonly dataSource: DataSource
  ) {}

  async createUser(name: string, email?: string): Promise<TestUser> {
    const uniqueEmail = email || this.generateUniqueEmail();
    // 사용자 생성 로직
    // 로그인
    // 프로필 조회
    // TestUser 반환
  }

  async createTea(userToken: string, teaData: Partial<CreateTeaDto>): Promise<TestTea> {
    // 차 생성 로직
  }

  async createNote(userToken: string, noteData: Partial<CreateNoteDto>): Promise<TestNote> {
    // 노트 생성 로직
  }

  generateUniqueEmail(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  }

  getAuthHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
  }
}
```

### 2. 테스트 데이터 빌더 패턴 적용

```typescript
class TestUserBuilder {
  private email?: string;
  private name = 'Test User';
  private password = 'password123';

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  withName(name: string): this {
    this.name = name;
    return this;
  }

  async build(helper: TestHelper): Promise<TestUser> {
    return helper.createUser(this.name, this.email);
  }
}
```

### 3. 테스트 그룹 리팩토링

**Before:**
```typescript
describe('/teas - 차 API', () => {
  let authToken: string;
  let userId: number;
  let uniqueEmail: string;

  beforeAll(async () => {
    uniqueEmail = `teatest-${Date.now()}@example.com`;
    await request(app.getHttpServer()).post('/auth/register')...
    // ... 긴 설정 코드
  });
});
```

**After:**
```typescript
describe('/teas - 차 API', () => {
  let helper: TestHelper;
  let testUser: TestUser;

  beforeAll(async () => {
    helper = new TestHelper(app, dataSource);
    testUser = await helper.createUser('Tea Test User');
  });

  it('GET /teas - 초기에는 빈 배열을 반환해야 함', async () => {
    const response = await request(app.getHttpServer())
      .get('/teas')
      .set(helper.getAuthHeaders(testUser.token))
      .expect(200);
    // ...
  });
});
```

### 4. 공통 설정 추출

**파일:** `backend/test/helpers/test-setup.ts`

```typescript
export async function setupTestApp(): Promise<{
  app: INestApplication;
  dataSource: DataSource;
  helper: TestHelper;
}> {
  // 앱 설정 로직
  // TestHelper 인스턴스 생성
  return { app, dataSource, helper };
}
```

### 5. 상수 분리

**파일:** `backend/test/constants/test-constants.ts`

```typescript
export const TEST_CONSTANTS = {
  DEFAULT_PASSWORD: 'password123',
  DEFAULT_USER_NAME: 'Test User',
  EMAIL_DOMAIN: '@example.com',
  TIMEOUT: 30000,
} as const;
```

## 우선순위별 개선 계획

### High Priority (즉시 개선)

1. ✅ 테스트 헬퍼 모듈 생성 (`TestHelper` 클래스)
2. ✅ 공통 인증 로직 추출 (`createUser` 메서드)
3. ✅ 상수 분리 (`TEST_CONSTANTS`)

### Medium Priority (점진적 개선)

4. 테스트 데이터 빌더 패턴 적용
5. 테스트 그룹 리팩토링 (기존 테스트 유지하면서 점진적 개선)

### Low Priority (선택적 개선)

6. 테스트 데이터 팩토리 패턴
7. 테스트 시나리오 추상화

## 예상 효과

### 코드 품질
- 코드 중복 70% 감소 예상
- 테스트 코드 가독성 향상
- 유지보수성 향상

### 개발 효율성
- 새 테스트 작성 시간 50% 단축
- 버그 수정 시간 단축
- 테스트 실패 원인 파악 시간 단축

### SOLID 원칙 준수
- ✅ Single Responsibility: 각 헬퍼 함수가 단일 책임
- ✅ Open/Closed: 확장 가능한 구조
- ✅ Liskov Substitution: 인터페이스 기반 설계
- ✅ Interface Segregation: 필요한 기능만 사용
- ✅ Dependency Inversion: 의존성 주입 패턴

