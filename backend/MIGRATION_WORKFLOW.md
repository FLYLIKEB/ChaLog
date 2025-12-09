# DB 스키마 변경 워크플로우

앞으로 DB 스키마를 변경하거나 신규 테이블을 만들 때 따라야 할 절차입니다.

## 📋 전체 워크플로우

```
1. 엔티티 파일 수정/생성
   ↓
2. Migration 자동 생성
   ↓
3. 생성된 Migration 파일 검토 및 수정
   ↓
4. 테스트 DB에 Migration 적용
   ↓
5. 테스트 실행 및 검증
   ↓
6. 커밋 및 PR
   ↓
7. 프로덕션 배포 시 자동 적용 (CI/CD)
```

## 🔄 상세 절차

### 1단계: 엔티티 파일 수정/생성

#### 예시 1: 기존 테이블에 컬럼 추가

`backend/src/notes/entities/note.entity.ts` 파일을 수정:

```typescript
@Entity('notes')
export class Note {
  // ... 기존 컬럼들 ...
  
  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null; // 새로 추가할 컬럼
}
```

#### 예시 2: 신규 테이블 생성

`backend/src/comments/entities/comment.entity.ts` 파일 생성:

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Note } from '../../notes/entities/note.entity';
import { User } from '../../users/entities/user.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  noteId: number;

  @ManyToOne(() => Note)
  @JoinColumn({ name: 'noteId' })
  note: Note;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ precision: 0 })
  createdAt: Date;
}
```

### 2단계: Migration 자동 생성

엔티티 변경사항을 기반으로 Migration 파일을 자동 생성:

```bash
cd backend

# Migration 생성 (엔티티와 DB 스키마 비교)
npm run migration:generate -- migrations/AddLocationToNote
# 또는
npm run migration:generate -- migrations/CreateCommentsTable
```

**생성되는 파일 예시:**
```
backend/migrations/1700000000007-AddLocationToNote.ts
```

### 3단계: 생성된 Migration 파일 검토 및 수정

자동 생성된 Migration 파일을 열어서 확인:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocationToNote1700000000007 implements MigrationInterface {
  name = 'AddLocationToNote1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notes\` 
      ADD COLUMN \`location\` varchar(100) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`notes\` 
      DROP COLUMN \`location\`
    `);
  }
}
```

**검토 사항:**
- ✅ SQL 쿼리가 올바른지 확인
- ✅ 컬럼 타입, 길이, nullable 설정 확인
- ✅ 인덱스나 외래키가 필요하면 추가
- ✅ `down` 메서드가 올바르게 구현되었는지 확인

**필요시 수정 예시:**

```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  // 인덱스도 함께 추가
  await queryRunner.query(`
    ALTER TABLE \`notes\` 
    ADD COLUMN \`location\` varchar(100) NULL
  `);
  
  await queryRunner.query(`
    CREATE INDEX \`IDX_notes_location\` ON \`notes\`(\`location\`)
  `);
}
```

### 4단계: 테스트 DB에 Migration 적용

```bash
cd backend

# 방법 1: 스크립트 사용 (권장)
TEST_DATABASE_URL=mysql://user:password@host:port/chalog_test ./scripts/sync-schema.sh test

# 방법 2: 직접 실행
TEST_DATABASE_URL=mysql://user:password@host:port/chalog_test npm run migration:run
```

**확인:**
```bash
# Migration 상태 확인
TEST_DATABASE_URL=mysql://... npm run migration:show
```

### 5단계: 테스트 실행 및 검증

```bash
# E2E 테스트 실행
npm run test:e2e

# 또는 수동으로 API 테스트
# 새로 추가된 컬럼/테이블이 정상 작동하는지 확인
```

### 6단계: 커밋 및 PR

```bash
# 엔티티 파일과 Migration 파일을 함께 커밋
git add src/**/*.entity.ts migrations/*.ts
git commit -m "feat: Add location column to notes table"
git push
```

**중요:** 엔티티 파일과 Migration 파일은 항상 함께 커밋해야 합니다!

### 7단계: 프로덕션 배포 시 자동 적용

CI/CD 파이프라인(`.github/workflows/deploy-backend.yml`)에서 자동으로 Migration이 실행됩니다.

또는 수동으로 실행:

```bash
cd backend
npm run migration:run
```

## 📝 실제 예시: comments 테이블 추가하기

### 1. 엔티티 파일 생성

`backend/src/comments/entities/comment.entity.ts`:

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Note } from '../../notes/entities/note.entity';
import { User } from '../../users/entities/user.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  noteId: number;

  @ManyToOne(() => Note, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'noteId' })
  note: Note;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  content: string;

  @CreateDateColumn({ precision: 0 })
  createdAt: Date;
}
```

### 2. Module에 엔티티 등록

`backend/src/comments/comments.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
// ...

@Module({
  imports: [TypeOrmModule.forFeature([Comment])],
  // ...
})
export class CommentsModule {}
```

### 3. Migration 생성

```bash
cd backend
npm run migration:generate -- migrations/CreateCommentsTable
```

### 4. 생성된 Migration 확인 및 수정

`backend/migrations/1700000000007-CreateCommentsTable.ts` 파일이 생성됩니다.

### 5. 테스트 DB에 적용

```bash
TEST_DATABASE_URL=mysql://... ./scripts/sync-schema.sh test
```

### 6. 테스트 및 커밋

```bash
npm run test:e2e
git add src/comments/entities/comment.entity.ts migrations/1700000000007-CreateCommentsTable.ts
git commit -m "feat: Add comments table"
```

## ⚠️ 주의사항

### ❌ 하지 말아야 할 것

1. **synchronize 옵션 사용 금지 (프로덕션)**
   - 프로덕션에서는 절대 `DB_SYNCHRONIZE=true` 사용 금지
   - 데이터 손실 위험이 있음

2. **Migration 파일 수정 금지 (이미 실행된 경우)**
   - 이미 실행된 Migration 파일은 절대 수정하지 마세요
   - 새로운 Migration을 생성하세요

3. **엔티티만 수정하고 Migration 생성 안 하기**
   - 엔티티 변경 시 반드시 Migration 생성 필요

### ✅ 해야 할 것

1. **항상 테스트 DB에서 먼저 테스트**
2. **엔티티와 Migration 파일 함께 커밋**
3. **Migration 파일 검토 후 적용**
4. **롤백 가능하도록 `down` 메서드 구현 확인**

## 🛠️ 유용한 명령어

```bash
# Migration 상태 확인
npm run migration:show

# Migration 실행
npm run migration:run

# Migration 롤백 (가장 최근 것만)
npm run migration:revert

# 새 Migration 생성 (자동)
npm run migration:generate -- migrations/MigrationName

# 빈 Migration 파일 생성 (수동 작성용)
npm run migration:create -- migrations/MigrationName

# 테스트 DB 동기화
TEST_DATABASE_URL=... ./scripts/sync-schema.sh test

# 프로덕션 DB 동기화
./scripts/sync-schema.sh prod

# 스키마 비교
DATABASE_URL=... TEST_DATABASE_URL=... ./scripts/compare-schema.sh
```

## 📚 참고 자료

- [`MIGRATIONS.md`](./MIGRATIONS.md) - Migration 사용 가이드
- [`TEST_DATABASE_SETUP.md`](./TEST_DATABASE_SETUP.md) - 테스트 DB 설정
- [TypeORM Migrations 공식 문서](https://typeorm.io/migrations)

