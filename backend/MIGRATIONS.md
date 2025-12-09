# TypeORM Migrations 가이드

이 프로젝트는 TypeORM Migrations를 사용하여 데이터베이스 스키마를 형상관리합니다.

## 개요

- **Migrations 폴더**: `backend/migrations/`
- **Migration 테이블**: `migrations` (TypeORM이 자동 생성)
- **Synchronize**: Production 환경에서는 비활성화되어 있으며, Migrations만 사용합니다.

## Migration 명령어

### 1. Migration 실행 (적용)

```bash
npm run migration:run
```

데이터베이스에 아직 적용되지 않은 모든 Migration을 실행합니다.

### 2. Migration 되돌리기 (롤백)

```bash
npm run migration:revert
```

가장 최근에 실행된 Migration을 되돌립니다.

### 3. Migration 상태 확인

```bash
npm run migration:show
```

실행된 Migration과 실행되지 않은 Migration 목록을 확인합니다.

### 4. 새로운 Migration 생성

#### 방법 1: 엔티티 변경사항으로부터 자동 생성

```bash
npm run migration:generate -- migrations/MigrationName
```

현재 엔티티와 데이터베이스 스키마를 비교하여 차이점을 Migration으로 생성합니다.

#### 방법 2: 빈 Migration 파일 생성

```bash
npm run migration:create -- migrations/MigrationName
```

빈 Migration 파일을 생성하여 수동으로 작성할 수 있습니다.

## Migration 파일 구조

각 Migration 파일은 다음과 같은 구조를 가집니다:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrationName1234567890123 implements MigrationInterface {
  name = 'MigrationName1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 스키마 변경 적용
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 스키마 변경 롤백
  }
}
```

## 기존 Migration 목록

1. **InitialSchema1700000000001**: 초기 스키마 (users, user_authentications, teas, notes)
2. **CreateTagsTables1700000000002**: tags 및 note_tags 테이블 생성
3. **CreateNoteLikesTable1700000000003**: note_likes 테이블 생성
4. **CreateNoteBookmarksTable1700000000004**: note_bookmarks 테이블 생성
5. **AddImagesColumnToNotes1700000000005**: notes 테이블에 images 컬럼 추가
6. **MakeMemoNullable1700000000006**: notes 테이블의 memo 컬럼을 nullable로 변경

## 주의사항

1. **Production 환경**: 
   - `synchronize` 옵션이 비활성화되어 있으므로 반드시 Migrations를 사용해야 합니다.
   - `DB_SYNCHRONIZE` 환경 변수를 `true`로 설정하지 마세요.

2. **개발 환경**:
   - 개발 중에는 `DB_SYNCHRONIZE=true`로 설정하여 자동 동기화를 사용할 수 있지만, 
   - Production 배포 전에는 반드시 Migrations로 스키마를 관리해야 합니다.

3. **Migration 실행 순서**:
   - Migration은 타임스탬프 순서대로 실행됩니다.
   - Migration 파일명의 타임스탬프를 변경하지 마세요.

4. **롤백 시 주의**:
   - `down` 메서드가 올바르게 구현되어 있는지 확인하세요.
   - 데이터 손실이 발생할 수 있는 변경사항은 롤백 시 주의가 필요합니다.

## CI/CD에서 Migration 실행

Production 배포 시 자동으로 Migration을 실행하려면 배포 스크립트에 다음 명령어를 추가하세요:

```bash
npm run migration:run
```

## 문제 해결

### Migration이 실행되지 않는 경우

1. `DATABASE_URL` 환경 변수가 올바르게 설정되어 있는지 확인
2. 데이터베이스 연결이 정상인지 확인
3. Migration 파일의 경로가 올바른지 확인

### Migration 충돌이 발생한 경우

1. `migration:show`로 현재 상태 확인
2. 필요시 수동으로 `migrations` 테이블 확인
3. 충돌하는 Migration을 수정하거나 새로운 Migration으로 해결

