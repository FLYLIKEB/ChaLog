import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // MySQL URL 파싱: mysql://user:password@host:port/database 또는 mysql://user@host:port/database
  const urlMatchWithPassword = databaseUrl.match(/^mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  const urlMatchWithoutPassword = databaseUrl.match(/^mysql:\/\/([^@]+)@([^:]+):(\d+)\/(.+)$/);
  
  let username: string;
  let password: string | undefined;
  let host: string;
  let port: string;
  let database: string;

  if (urlMatchWithPassword) {
    [, username, password, host, port, database] = urlMatchWithPassword;
  } else if (urlMatchWithoutPassword) {
    [, username, host, port, database] = urlMatchWithoutPassword;
    password = undefined;
  } else {
    throw new Error(
      'Invalid DATABASE_URL format. Expected: mysql://user:password@host:port/database or mysql://user@host:port/database'
    );
  }

  // SSL 설정 (AWS RDS/Aurora 사용 시 권장)
  const sslEnabled = configService.get<string>('DB_SSL_ENABLED') === 'true';
  const sslConfig = sslEnabled
    ? {
        ssl: {
          rejectUnauthorized: false, // 프로덕션에서는 CA 인증서 사용 권장
        },
      }
    : {};

  return {
    type: 'mysql',
    host,
    port: parseInt(port, 10),
    username,
    ...(password && { password }),
    database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    // synchronize는 개발 환경에서도 명시적으로 활성화해야 함 (데이터 손실 위험)
    synchronize: configService.get<string>('NODE_ENV') === 'development' && 
                 configService.get<string>('DB_SYNCHRONIZE') === 'true',
    logging: configService.get<string>('NODE_ENV') === 'development',
    // AWS RDS/Aurora 연결 최적화
    extra: {
      connectionLimit: 10, // 연결 풀 최대 크기
      ...sslConfig,
    },
  };
};

