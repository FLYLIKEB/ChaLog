# 테스트 실행 시 S3 파일 업로드 주의사항

## ⚠️ 현재 상태

테스트가 실제 S3 버킷에 파일을 업로드할 수 있습니다.

### 위험 요소

1. **프로덕션 버킷 사용 가능성**
   - 테스트 환경 변수(`.env.test`)가 없으면 프로덕션 환경 변수(`.env`)를 사용합니다.
   - `AWS_S3_BUCKET_NAME`이 프로덕션 버킷으로 설정되어 있으면 테스트 파일이 프로덕션 버킷에 업로드됩니다.

2. **파일 덮어쓰기 가능성**
   - `generateKey` 메서드는 타임스탬프와 랜덤 문자열을 사용하여 고유한 키를 생성합니다.
   - 따라서 기존 파일을 덮어쓸 가능성은 매우 낮습니다.
   - 하지만 테스트 파일이 프로덕션 버킷에 쌓일 수 있습니다.

3. **테스트 파일 정리 부재**
   - 현재 테스트는 업로드된 S3 파일을 정리하지 않습니다.
   - 테스트를 반복 실행하면 S3 버킷에 테스트 파일이 계속 쌓일 수 있습니다.

## ✅ 권장 해결책

### 1. 테스트용 별도 S3 버킷 사용 (권장)

`.env.test` 파일에 테스트용 버킷을 설정:

```env
AWS_S3_BUCKET_NAME=chalog-test
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=your-test-key
AWS_SECRET_ACCESS_KEY=your-test-secret
```

### 2. S3Service Mock 사용 (대안)

테스트 환경에서 S3Service를 mock하여 실제 업로드를 방지:

```typescript
// backend/test/setup/test-setup.ts
const moduleFixture: TestingModule = await Test.createTestingModule({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.test', '.env'],
      ignoreEnvFile: false,
    }),
    AppModule,
  ])
  .overrideProvider(S3Service)
  .useValue({
    uploadFile: jest.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/test-key.jpg'),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    generateKey: jest.fn().mockReturnValue('test/test-key.jpg'),
  })
  .compile();
```

### 3. 테스트 후 파일 정리 (추가 보안)

테스트가 실제 S3에 업로드하는 경우, `afterAll`에서 업로드된 파일을 정리:

```typescript
afterAll(async () => {
  // 업로드된 테스트 파일 정리
  if (uploadedFileKeys.length > 0) {
    await Promise.all(
      uploadedFileKeys.map(key => s3Service.deleteFile(key))
    );
  }
  await teardownTestApp(context);
});
```

## 🔍 확인 방법

테스트 실행 전에 다음을 확인하세요:

1. `.env.test` 파일이 존재하는지 확인
2. `AWS_S3_BUCKET_NAME`이 테스트용 버킷으로 설정되어 있는지 확인
3. 테스트 실행 후 S3 버킷에 테스트 파일이 업로드되었는지 확인

## 📝 현재 구현 상태

- ✅ `generateKey`가 고유한 키를 생성 (타임스탬프 + 랜덤 문자열)
- ✅ 프로필 이미지는 `profiles/` prefix 사용
- ❌ 테스트용 별도 버킷 설정 없음
- ❌ 테스트 파일 자동 정리 없음
- ❌ S3Service Mock 없음



