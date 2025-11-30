# ChaLog 서버 아키텍처

> **💡 Mermaid 다이어그램 보기**: 이 문서는 Mermaid 다이어그램을 사용합니다.
> 
> **VS Code에서 보는 방법:**
> 1. 확장 프로그램 설치: `Cmd+Shift+X` → "Markdown Preview Mermaid Support" 검색 → 설치
> 2. 또는 "Mermaid Preview" 확장 프로그램 설치
> 3. 마크다운 파일을 열고 `Cmd+Shift+V` (Mac) 또는 `Ctrl+Shift+V` (Windows/Linux)로 미리보기 열기
> 4. 프로젝트의 `.vscode/settings.json`에 Mermaid 테마 및 스타일 설정이 포함되어 있습니다
>    - 기본 테마: `dark` 테마 (다크 모드)
>    - 폰트 크기: 14px, 줄 간격: 1.6
> 
> **온라인에서 보는 방법:**
> - [Mermaid Live Editor](https://mermaid.live/)에서 코드를 복사하여 확인
> - GitHub에서 파일을 열면 자동으로 렌더링됨

## 전체 시스템 구조

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc', 'noteBkgColor':'#fff', 'noteTextColor':'#1a202c', 'noteBorderColor':'#4a5568'}}}%%
flowchart TB
    subgraph Client["클라이언트 브라우저"]
        Browser["React 18 + Vite SPA<br/>localhost:5173"]
    end

    subgraph Vercel["Vercel 프론트엔드 배포"]
        StaticFiles["Static Files<br/>dist/index.html<br/>assets/*.js, *.css"]
        Proxy["Vercel Functions<br/>api/proxy.ts<br/>Runtime: nodejs20.x<br/>경로: /api/* → /api/proxy"]
    end

    subgraph Backend["AWS EC2 백엔드 서버"]
        NestJS["NestJS Application<br/>52.78.150.124:3000"]
        
        subgraph NestJSModules["NestJS Modules"]
            Main["main.ts<br/>CORS, ValidationPipe"]
            AppModule["AppModule"]
            ConfigModule["ConfigModule<br/>환경 변수"]
            ThrottlerModule["ThrottlerModule<br/>Rate Limiting"]
            TypeOrmModule["TypeOrmModule<br/>DB 연결"]
            AuthModule["AuthModule<br/>인증"]
            UsersModule["UsersModule<br/>사용자"]
            TeasModule["TeasModule<br/>차"]
            NotesModule["NotesModule<br/>노트"]
            HealthController["HealthController<br/>헬스 체크"]
        end
    end

    subgraph Database["AWS RDS MariaDB"]
        Tables["Tables<br/>users<br/>user_authentications<br/>teas<br/>notes"]
    end

    Browser -->|HTTPS 요청| StaticFiles
    Browser -->|API 요청| Proxy
    Proxy -->|HTTP 프록시| NestJS
    NestJS --> NestJSModules
    AppModule --> ConfigModule
    AppModule --> ThrottlerModule
    AppModule --> TypeOrmModule
    AppModule --> AuthModule
    AppModule --> UsersModule
    AppModule --> TeasModule
    AppModule --> NotesModule
    AppModule --> HealthController
    TypeOrmModule -->|SSH 터널<br/>직접 연결| Tables
```

## 상세 모듈 구조

### 1. 프론트엔드 (Vite + React)

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc'}}}%%
graph TD
    Main["main.tsx<br/>진입점"] --> App["App.tsx<br/>Router + FAB + Toaster"]
    
    App --> Pages["pages/"]
    Pages --> Home["Home.tsx"]
    Pages --> Search["Search.tsx"]
    Pages --> TeaDetail["TeaDetail.tsx"]
    Pages --> NoteDetail["NoteDetail.tsx"]
    Pages --> NewNote["NewNote.tsx"]
    Pages --> MyNotes["MyNotes.tsx"]
    Pages --> Settings["Settings.tsx"]
    Pages --> Login["Login.tsx"]
    Pages --> Register["Register.tsx"]
    
    App --> Components["components/"]
    Components --> Header["Header.tsx"]
    Components --> NoteCard["NoteCard.tsx"]
    Components --> TeaCard["TeaCard.tsx"]
    Components --> FAB["FloatingActionButton.tsx"]
    Components --> UI["ui/<br/>shadcn/ui"]
    
    App --> Lib["lib/"]
    Lib --> API["api.ts<br/>API 클라이언트"]
    API --> ApiClient["apiClient<br/>Axios 인스턴스"]
    API --> TeasAPI["teasApi<br/>차 API"]
    API --> NotesAPI["notesApi<br/>노트 API"]
    API --> AuthAPI["authApi<br/>인증 API"]
    Lib --> Logger["logger.ts<br/>로깅 유틸리티"]
    
    App --> Contexts["contexts/"]
    Contexts --> AuthContext["AuthContext.tsx<br/>인증 상태 관리"]
    
    App --> Hooks["hooks/"]
    Hooks --> UseAsyncData["useAsyncData.ts<br/>비동기 데이터 훅"]
```

### 2. Vercel 프록시 (api/proxy.ts)

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc', 'errorBkgColor':'#fed7d7', 'errorTextColor':'#742a2a'}}}%%
flowchart LR
    Client["클라이언트"] -->|"/api/teas"| Proxy["Vercel Function<br/>api/proxy.ts"]
    
    Proxy --> Process["프록시 로직"]
    Process --> Method["메서드 전달<br/>GET, POST, PUT,<br/>PATCH, DELETE"]
    Process --> Headers["헤더 전달<br/>Content-Type<br/>Authorization"]
    Process --> Query["쿼리 파라미터<br/>전달"]
    Process --> Timeout["타임아웃 처리<br/>기본 10초"]
    
    Method --> Backend["백엔드 서버<br/>52.78.150.124:3000"]
    Headers --> Backend
    Query --> Backend
    Timeout --> Backend
    
    Backend --> Response["응답 처리"]
    Response -->|"JSON 또는 Stream"| Client
    Response -->|"에러 발생 시"| Error["에러 처리<br/>502 Bad Gateway<br/>504 Gateway Timeout"]
```

**요청 흐름:**
```
클라이언트 → /api/teas → Vercel Function → http://52.78.150.124:3000/teas
```

### 3. 백엔드 (NestJS)

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc'}}}%%
graph TD
    Main["main.ts<br/>애플리케이션 부트스트랩<br/>CORS 설정<br/>ValidationPipe 설정<br/>서버 시작 포트 3000"] --> AppModule["app.module.ts<br/>루트 모듈"]
    
    AppModule --> ConfigModule["ConfigModule<br/>환경 변수 관리"]
    AppModule --> ThrottlerModule["ThrottlerModule<br/>Rate Limiting<br/>1분당 10회"]
    AppModule --> TypeOrmModule["TypeOrmModule<br/>데이터베이스 연결"]
    AppModule --> AuthModule["AuthModule<br/>인증 모듈"]
    AppModule --> UsersModule["UsersModule<br/>사용자 모듈"]
    AppModule --> TeasModule["TeasModule<br/>차 모듈"]
    AppModule --> NotesModule["NotesModule<br/>노트 모듈"]
    AppModule --> HealthController["HealthController<br/>헬스 체크"]
    
    AuthModule --> AuthController["auth.controller.ts<br/>POST /auth/register<br/>POST /auth/login<br/>POST /auth/kakao<br/>POST /auth/profile"]
    AuthModule --> AuthService["auth.service.ts<br/>인증 로직"]
    AuthModule --> Strategies["strategies/"]
    Strategies --> JWTStrategy["jwt.strategy.ts<br/>JWT 전략"]
    Strategies --> LocalStrategy["local.strategy.ts<br/>로컬 전략"]
    AuthModule --> AuthDTO["dto/<br/>register.dto.ts<br/>login.dto.ts<br/>kakao-login.dto.ts"]
    
    UsersModule --> UsersController["users.controller.ts<br/>GET /users/:id"]
    UsersModule --> UsersService["users.service.ts<br/>사용자 비즈니스 로직"]
    UsersModule --> UserEntities["entities/<br/>user.entity.ts<br/>user-authentication.entity.ts"]
    
    TeasModule --> TeasController["teas.controller.ts<br/>GET /teas<br/>GET /teas/:id<br/>POST /teas"]
    TeasModule --> TeasService["teas.service.ts<br/>차 비즈니스 로직"]
    TeasModule --> TeaEntity["entities/<br/>tea.entity.ts"]
    TeasModule --> TeaDTO["dto/<br/>create-tea.dto.ts"]
    
    NotesModule --> NotesController["notes.controller.ts<br/>GET /notes<br/>GET /notes/:id<br/>POST /notes<br/>PATCH /notes/:id<br/>DELETE /notes/:id"]
    NotesModule --> NotesService["notes.service.ts<br/>노트 비즈니스 로직"]
    NotesModule --> NoteEntity["entities/<br/>note.entity.ts"]
    NotesModule --> NoteDTO["dto/<br/>create-note.dto.ts<br/>update-note.dto.ts"]
    
    TypeOrmModule --> TypeOrmConfig["database/<br/>typeorm.config.ts<br/>MariaDB 연결 설정<br/>SSL 설정 AWS RDS<br/>연결 풀 설정"]

```

## API 엔드포인트 구조

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc'}}}%%
graph TB
    subgraph Auth["인증 Auth"]
        A1["POST /auth/register<br/>회원가입"]
        A2["POST /auth/login<br/>로그인<br/>이메일/비밀번호"]
        A3["POST /auth/kakao<br/>카카오 로그인"]
        A4["POST /auth/profile<br/>프로필 조회<br/>JWT 필요"]
    end

    subgraph Users["사용자 Users"]
        U1["GET /users/:id<br/>사용자 정보 조회"]
    end

    subgraph Teas["차 Teas"]
        T1["GET /teas<br/>차 목록 조회"]
        T2["GET /teas?q=검색어<br/>차 검색"]
        T3["GET /teas/:id<br/>차 상세 조회"]
        T4["POST /teas<br/>차 생성<br/>JWT 필요"]
    end

    subgraph Notes["노트 Notes"]
        N1["GET /notes<br/>노트 목록 조회"]
        N2["GET /notes?userId=ID<br/>사용자별 노트"]
        N3["GET /notes?public=true<br/>공개 노트만"]
        N4["GET /notes?teaId=ID<br/>차별 노트"]
        N5["GET /notes/:id<br/>노트 상세 조회"]
        N6["POST /notes<br/>노트 생성<br/>JWT 필요"]
        N7["PATCH /notes/:id<br/>노트 수정<br/>JWT 필요"]
        N8["DELETE /notes/:id<br/>노트 삭제<br/>JWT 필요"]
    end

    subgraph Health["헬스 체크 Health"]
        H1["GET /health<br/>서버 및 DB 상태 확인"]
    end

```

## 데이터 흐름

### 1. 인증 플로우

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc'}}}%%
sequenceDiagram
    participant Client as 클라이언트
    participant Proxy as Vercel Proxy
    participant Backend as 백엔드 NestJS
    participant Auth as AuthService
    participant DB as MariaDB

    Client->>Proxy: POST /api/auth/login<br/>email, password
    Proxy->>Backend: POST /auth/login<br/>프록시 요청
    Backend->>Auth: Local Strategy 검증
    Auth->>DB: 사용자 조회 및<br/>비밀번호 검증
    DB-->>Auth: 사용자 정보
    Auth->>Auth: JWT 토큰 생성
    Auth-->>Backend: accessToken, user
    Backend-->>Proxy: JSON 응답
    Proxy-->>Client: accessToken, user
    Client->>Client: 토큰 저장<br/>localStorage
    Note over Client: 이후 요청에<br/>Authorization 헤더 포함
```

### 2. 데이터 조회 플로우

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc'}}}%%
sequenceDiagram
    participant Client as 클라이언트
    participant Proxy as Vercel Proxy
    participant Backend as 백엔드 NestJS
    participant Service as TeasService
    participant DB as MariaDB

    Client->>Proxy: GET /api/teas
    Proxy->>Backend: GET /teas<br/>프록시 요청
    Backend->>Service: findAll()
    Service->>DB: SELECT * FROM teas
    DB-->>Service: 차 목록 데이터
    Service-->>Backend: 정규화된 데이터
    Backend-->>Proxy: JSON 응답
    Proxy-->>Client: JSON 응답
    Client->>Client: 데이터 파싱 및<br/>렌더링
```

### 3. 데이터 생성 플로우

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc'}}}%%
sequenceDiagram
    participant Client as 클라이언트
    participant Proxy as Vercel Proxy
    participant Backend as 백엔드 NestJS
    participant Guard as JWT Guard
    participant Service as NotesService
    participant DB as MariaDB

    Client->>Proxy: POST /api/notes<br/>Authorization: Bearer token<br/>note data
    Proxy->>Backend: POST /notes<br/>프록시 요청
    Backend->>Guard: JWT 토큰 검증
    Guard-->>Backend: 인증 성공
    Backend->>Service: create(noteData)
    Service->>Service: ValidationPipe 검증
    Service->>DB: INSERT INTO notes
    DB-->>Service: 저장된 엔티티
    Service-->>Backend: 정규화된<br/>노트 데이터
    Backend-->>Proxy: JSON 응답
    Proxy-->>Client: JSON 응답
    Client->>Client: 성공 처리 및<br/>UI 업데이트
```

## 보안 계층

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc', 'errorBkgColor':'#fed7d7', 'errorTextColor':'#742a2a'}}}%%
flowchart TB
    Request["클라이언트 요청"] --> CORS["CORS 검증<br/>허용된 Origin만<br/>Credentials 허용"]
    
    CORS -->|통과| RateLimit["Rate Limiting<br/>전역: 1분당 10회<br/>인증: 1분당 5회"]
    
    RateLimit -->|통과| AuthCheck{"인증 필요?"}
    
    AuthCheck -->|예| JWTGuard["JWT Guard<br/>토큰 검증"]
    AuthCheck -->|아니오| Validation
    
    JWTGuard -->|유효한 토큰| Validation["ValidationPipe<br/>DTO 기반 검증<br/>전역 파이프 적용"]
    JWTGuard -->|무효한 토큰| AuthError["401 Unauthorized"]
    
    Validation -->|검증 통과| Controller["Controller<br/>요청 처리"]
    Validation -->|검증 실패| ValidationError["400 Bad Request"]
    
    Controller --> Service["Service<br/>비즈니스 로직"]
    Service --> Database["Database<br/>데이터 처리"]

```

### 보안 계층 상세

#### 1. Rate Limiting
- **전역**: 1분당 10회 요청 제한
- **인증 엔드포인트**: 1분당 5회 요청 제한

#### 2. 인증
- **JWT**: Access Token 기반 인증
- **전략**: Local Strategy (이메일/비밀번호), Kakao OAuth

#### 3. CORS
- 허용된 Origin만 요청 허용
- Credentials 허용 (쿠키/인증 헤더)

#### 4. Validation
- DTO 기반 입력 검증
- 전역 ValidationPipe 사용

## 배포 구조

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc'}}}%%
flowchart TB
    subgraph GitHub["GitHub Repository"]
        Repo["cha-log Repository"]
    end

    subgraph FrontendDeploy["프론트엔드 배포 Vercel"]
        VercelBuild["빌드: npm run build<br/>dist/ 생성"]
        VercelDeploy["자동 배포<br/>GitHub 연동"]
        VercelEnv["환경 변수 관리<br/>Vercel 대시보드"]
        VercelCDN["Vercel CDN<br/>전역 배포"]
    end

    subgraph BackendDeploy["백엔드 배포 AWS EC2"]
        GitHubActions["GitHub Actions<br/>자동 배포 워크플로우"]
        EC2Instance["EC2 인스턴스<br/>t3.small<br/>52.78.150.124"]
        PM2["PM2 프로세스 관리<br/>ecosystem.config.js"]
        NestJSApp["NestJS 앱<br/>포트 3000"]
    end

    subgraph DatabaseDeploy["데이터베이스 AWS RDS"]
        RDSInstance["RDS MariaDB<br/>인스턴스"]
        SSHTunnel["SSH 터널<br/>로컬 개발"]
        DirectConnection["직접 연결<br/>프로덕션"]
        SSL["SSL 활성화<br/>프로덕션"]
    end

    Repo -->|main 브랜치 푸시| VercelDeploy
    Repo -->|backend/ 변경 감지| GitHubActions
    
    VercelDeploy --> VercelBuild
    VercelBuild --> VercelCDN
    VercelDeploy --> VercelEnv
    
    GitHubActions --> EC2Instance
    EC2Instance --> PM2
    PM2 --> NestJSApp
    
    NestJSApp -->|로컬 개발| SSHTunnel
    NestJSApp -->|프로덕션| DirectConnection
    SSHTunnel --> RDSInstance
    DirectConnection --> SSL
    SSL --> RDSInstance

```

## 환경 변수

### 프론트엔드
- `VITE_API_BASE_URL`: 백엔드 API URL (기본값: `/api`)

### Vercel Functions
- `BACKEND_URL`: 백엔드 서버 URL (기본값: `http://52.78.150.124:3000`)
- `BACKEND_TIMEOUT_MS`: 타임아웃 시간 (기본값: `10000`)
- `LOG_PROXY_REQUESTS`: 프록시 요청 로깅 여부 (기본값: `true`)

### 백엔드
- `PORT`: 서버 포트 (기본값: `3000`)
- `DATABASE_URL`: 데이터베이스 연결 URL
- `JWT_SECRET`: JWT 시크릿 키
- `FRONTEND_URL`: 프론트엔드 URL (CORS 설정)
- `FRONTEND_URLS`: 여러 프론트엔드 URL (쉼표 구분)
- `NODE_ENV`: 환경 (development/production)
- `DB_SSL_ENABLED`: SSL 활성화 여부
- `DB_SYNCHRONIZE`: TypeORM 동기화 여부 (개발 환경만)

## 네트워크 흐름

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#e2e8f0', 'primaryTextColor':'#1a202c', 'primaryBorderColor':'#4a5568', 'lineColor':'#718096', 'secondaryColor':'#cbd5e0', 'tertiaryColor':'#f7fafc'}}}%%
flowchart LR
    Browser["브라우저"] -->|HTTPS<br/>포트 443| VercelCDN["Vercel CDN"]
    VercelCDN -->|Static Files| Static["Static Files"]
    VercelCDN -->|API 요청| Functions["Vercel Functions"]
    Functions -->|HTTP<br/>포트 3000| EC2["AWS EC2<br/>52.78.150.124"]
    EC2 -->|SSH 터널<br/>로컬 개발<br/>또는<br/>직접 연결<br/>프로덕션| RDS["AWS RDS<br/>MariaDB"]

```

## 모니터링 및 로깅

### 프론트엔드
- 개발 환경: `logger.ts`를 통한 콘솔 로깅
- 프로덕션: Vercel 로그

### 백엔드
- 개발 환경: NestJS 기본 로깅
- 프로덕션: PM2 로그, EC2 시스템 로그

### 프록시
- Vercel Functions 로그
- 요청/응답 로깅 (LOG_PROXY_REQUESTS 환경 변수로 제어)

