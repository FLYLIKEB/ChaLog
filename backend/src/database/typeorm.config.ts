import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  // 테스트 환경에서는 TEST_DATABASE_URL만 사용 (필수), 프로덕션에서는 DATABASE_URL 사용
  const isTest = configService.get<string>('NODE_ENV') === 'test' || process.env.NODE_ENV === 'test';
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

  // Node.js 내장 URL 클래스를 사용하여 견고한 파싱
  // 특수 문자(:, @ 등)가 비밀번호에 포함되어도, IPv6, 쿼리 파라미터 등도 올바르게 처리
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
  const username = url.username;
  if (!username) {
    throw new Error('DATABASE_URL must include a username');
  }

  const password = url.password || undefined; // 빈 문자열은 undefined로 변환
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

  // SSL 설정 (AWS RDS/Aurora 사용 시 권장)
  const sslEnabled = configService.get<string>('DB_SSL_ENABLED') === 'true';
  const sslRejectUnauthorized = configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';
  const sslConfig = sslEnabled
    ? {
        ssl: {
          rejectUnauthorized: sslRejectUnauthorized, // 기본값: true (보안 강화), 개발/테스트에서만 false로 설정
        },
      }
    : {};

  return {
    type: 'mysql',
    host: hostname,
    port,
    username,
    ...(password && { password }),
    database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../migrations/**/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    migrationsRun: false, // 자동 실행 비활성화 (수동으로 migration 실행)
    // synchronize는 개발 환경에서도 명시적으로 활성화해야 함 (데이터 손실 위험)
    // 테스트 환경에서는 synchronize를 false로 설정 (테스트 DB는 수동으로 관리)
    // Production에서는 반드시 false로 설정하고 migrations만 사용
    synchronize: !isTest && 
                 configService.get<string>('NODE_ENV') === 'development' && 
                 configService.get<string>('DB_SYNCHRONIZE') === 'true',
    logging: configService.get<string>('NODE_ENV') === 'development' || isTest,
    // AWS RDS/Aurora 연결 최적화
    // t3.small 환경에 맞게 연결 풀 크기 조정 (2GB RAM, 2 vCPU)
    extra: {
      connectionLimit: 8, // 연결 풀 최대 크기 (t3.small 최적화: 5 → 8)
      // 연결 타임아웃 설정 (밀리초)
      connectTimeout: 60000, // 60초 - 연결 시도 타임아웃
      // 연결 유지 설정 (네트워크 불안정 시 연결 중단 방지)
      enableKeepAlive: true, // Keep-alive 활성화
      keepAliveInitialDelay: 0, // Keep-alive 초기 지연 시간 (0 = 즉시 시작)
      // 참고: acquireTimeout, timeout, reconnect는 mysql2에서 지원되지 않으므로 제거됨
      // 재연결은 TypeORM의 연결 에러 핸들러와 PROTOCOL_CONNECTION_LOST/ECONNRESET 처리로 관리됨
      ...sslConfig,
    },
  };
};

