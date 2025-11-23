import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  
  // MySQL URL 파싱: mysql://user:password@host:port/database
  const urlMatch = databaseUrl?.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  
  if (!urlMatch) {
    throw new Error('Invalid DATABASE_URL format. Expected: mysql://user:password@host:port/database');
  }

  const [, username, password, host, port, database] = urlMatch;

  return {
    type: 'mysql',
    host,
    port: parseInt(port, 10),
    username,
    password,
    database,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    // synchronize는 개발 환경에서도 명시적으로 활성화해야 함 (데이터 손실 위험)
    synchronize: configService.get<string>('NODE_ENV') === 'development' && 
                 configService.get<string>('DB_SYNCHRONIZE') === 'true',
    logging: configService.get<string>('NODE_ENV') === 'development',
  };
};

