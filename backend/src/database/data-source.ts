import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// 환경 변수 로드
config();

// ConfigService 인스턴스 생성
const configService = new ConfigService();

// DATABASE_URL 파싱 (테스트 환경에서는 TEST_DATABASE_URL만 사용, 필수)
const isTest = process.env.NODE_ENV === 'test' || process.argv.includes('--test-db');
const databaseUrl = isTest 
  ? (() => {
      const testDbUrl = configService.get<string>('TEST_DATABASE_URL');
      if (!testDbUrl) {
        throw new Error(
          'TEST_DATABASE_URL must be set for tests. ' +
          'Using production DATABASE_URL is dangerous and will delete all data. ' +
          'Please set TEST_DATABASE_URL to a test database.'
        );
      }
      return testDbUrl;
    })()
  : configService.get<string>('DATABASE_URL');

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// DATABASE_URL 파싱 (에러 핸들링 및 프로토콜 검증)
let url: URL;
try {
  url = new URL(databaseUrl);
} catch (error) {
  throw new Error(
    `Invalid DATABASE_URL format: ${error instanceof Error ? error.message : 'Invalid URL format'}. Expected: mysql://user:password@host:port/database`
  );
}

// 프로토콜 검증
if (url.protocol !== 'mysql:') {
  throw new Error(`Invalid DATABASE_URL protocol: expected 'mysql:', got '${url.protocol}'`);
}

// 필수 값 추출 및 검증
const username = url.username ? decodeURIComponent(url.username) : undefined;
if (!username) {
  throw new Error('DATABASE_URL must include a username');
}

const password = url.password ? decodeURIComponent(url.password) : undefined;
const hostname = url.hostname;
if (!hostname) {
  throw new Error('DATABASE_URL must include a hostname');
}

// 포트 처리: 없으면 MySQL 기본 포트(3306) 사용
const port = url.port ? parseInt(url.port, 10) : 3306;
if (isNaN(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid DATABASE_URL port: ${url.port}`);
}

// 데이터베이스 이름: pathname에서 첫 번째 '/' 제거
const database = url.pathname.slice(1);
if (!database) {
  throw new Error('DATABASE_URL must include a database name in the path');
}

// SSL 설정
const sslEnabled = configService.get<string>('DB_SSL_ENABLED') === 'true';
const sslRejectUnauthorized = configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';
const sslConfig = sslEnabled
  ? {
      ssl: {
        rejectUnauthorized: sslRejectUnauthorized,
      },
    }
  : {};

// DataSource 생성 (Migration 실행용)
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: hostname,
  port,
  username,
  password,
  database,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../migrations/**/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false, // Migration 사용 시 synchronize는 항상 false
  logging: configService.get<string>('NODE_ENV') === 'development',
  extra: {
    connectionLimit: 8,
    connectTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ...sslConfig,
  },
} as DataSourceOptions);

