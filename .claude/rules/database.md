# Database & Migrations

## 핵심 규칙
- **마이그레이션은 TypeORM CLI로만 생성** (수동 SQL 파일 작성 금지)
- `synchronize: true` 운영 환경 절대 금지
- 엔티티 변경 시 Migration 파일 반드시 함께 커밋

## Migration 파일 작성 주의사항
- `Index`는 TypeORM **데코레이터**이므로 migration에서 `new Index(...)` 사용 금지
  - 인덱스 추가 시: `new TableIndex({ columnNames: [...] })` 사용
  - MySQL은 FK 컬럼에 자동으로 인덱스 생성 — 별도 인덱스 불필요한 경우 많음

## Migration 명령어 (backend/ 디렉토리에서)
```bash
npm run migration:generate -- migrations/MigrationName  # 생성
npm run migration:run                                    # 적용
npm run migration:revert                                 # 롤백
npm run migration:show                                   # 상태 확인
```

## 스키마 변경 워크플로우
1. 엔티티 파일(`*.entity.ts`) 수정
2. Migration 생성: `npm run migration:generate -- migrations/MigrationName`
3. 생성된 파일의 `up`/`down` 메서드 검토
4. 테스트 DB 적용: `TEST_DATABASE_URL=... ./scripts/sync-schema.sh test`
5. E2E 테스트: `npm run test:e2e`
6. 엔티티 + Migration 파일 함께 커밋

## DB 접속
- **원격(Lightsail)**: SSH 터널 경유 → `cd backend/scripts && ./start-ssh-tunnel.sh` (로컬 3307 → 원격 3306)
- **로컬**: `LOCAL_DATABASE_URL=mysql://root:<pw>@127.0.0.1:3306/chalog`
- **테스트**: `TEST_DATABASE_URL` (DB명에 "test" 필수)

## 스크립트
```bash
cd backend/scripts
./start-ssh-tunnel.sh    # SSH 터널 시작
./stop-ssh-tunnel.sh     # SSH 터널 종료
./check-database.sh      # DB 연결 확인
```

## 상세 문서
- 스키마/관계도: `docs/infrastructure/DATABASE.md`
- Migration 워크플로우: `backend/MIGRATION_WORKFLOW.md`
