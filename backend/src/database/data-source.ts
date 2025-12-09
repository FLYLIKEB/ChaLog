import { DataSource, DataSourceOptions } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// 환경 변수 로드
config();

// ConfigService 인스턴스 생성
const configService = new ConfigService();

// DATABASE_URL 파싱 (테스트 환경에서는 TEST_DATABASE_URL 우선 사용)
const isTest = process.env.NODE_ENV === 'test' || process.argv.includes('--test-db');
const databaseUrl = isTest 
  ? (configService.get<string>('TEST_DATABASE_URL') || configService.get<string>('DATABASE_URL'))
  : configService.get<string>('DATABASE_URL');

if (!databaseUrl) {
  throw new Error('DATABASE_URL or TEST_DATABASE_URL environment variable is not set');
}

const url = new URL(databaseUrl);
const username = url.username;
const password = url.password || undefined;
const hostname = url.hostname;
const port = url.port ? parseInt(url.port, 10) : 3306;
const database = url.pathname.slice(1);

if (!username || !hostname || !database) {
  throw new Error('Invalid DATABASE_URL format');
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
    acquireTimeout: 60000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ...sslConfig,
  },
} as DataSourceOptions);

