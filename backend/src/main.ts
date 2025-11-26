import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  
  // CORS 설정
  // 여러 origin 허용 (로컬 개발 + Vercel 배포)
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://cha-log-gilt.vercel.app',
  ];
  
  // 환경 변수에서 추가 origin 가져오기
  const frontendUrl = configService.get('FRONTEND_URL') as string;
  if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }
  
  // FRONTEND_URLS 환경 변수로 여러 URL 설정 가능 (쉼표로 구분)
  const additionalUrls = configService.get('FRONTEND_URLS') as string;
  if (additionalUrls) {
    additionalUrls.split(',').forEach(url => {
      const trimmedUrl = url.trim();
      if (trimmedUrl && !allowedOrigins.includes(trimmedUrl)) {
        allowedOrigins.push(trimmedUrl);
      }
    });
  }

  app.enableCors({
    origin: (origin, callback) => {
      // origin이 없으면 (같은 origin 요청) 허용
      if (!origin) {
        return callback(null, true);
      }
      
      // 허용된 origin인지 확인
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // 전역 ValidationPipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = parseInt((configService.get('PORT') as string) || '3000', 10);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
