import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';

@Controller('health')
export class HealthController {
  private readonly startTime: number;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.startTime = Date.now();
  }

  @Get()
  async check() {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000); // 초 단위
    const memoryUsage = process.memoryUsage();
    
    // 메모리 사용량을 MB로 변환
    const formatMemory = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

    try {
      // 데이터베이스 연결 상태 확인 - 간단한 쿼리 실행
      const dbStartTime = Date.now();
      await this.userRepository.query('SELECT 1');
      const dbResponseTime = Date.now() - dbStartTime;

      const environment = this.configService.get('NODE_ENV') || 'development';
      const port = this.configService.get('PORT') || '3000';
      
      return {
        status: 'healthy',
        service: 'ChaLog Backend API',
        version: '1.0.0',
        environment,
        timestamp,
        uptime: {
          seconds: uptime,
          formatted: this.formatUptime(uptime),
        },
        server: {
          port: parseInt(port, 10),
          nodeVersion: process.version,
          platform: process.platform,
        },
        memory: {
          rss: `${formatMemory(memoryUsage.rss)} MB`,
          heapTotal: `${formatMemory(memoryUsage.heapTotal)} MB`,
          heapUsed: `${formatMemory(memoryUsage.heapUsed)} MB`,
          external: `${formatMemory(memoryUsage.external)} MB`,
        },
        database: {
          status: 'connected',
          responseTime: `${dbResponseTime}ms`,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'ChaLog Backend API',
        version: '1.0.0',
        timestamp,
        uptime: {
          seconds: uptime,
          formatted: this.formatUptime(uptime),
        },
        database: {
          status: 'disconnected',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}일`);
    if (hours > 0) parts.push(`${hours}시간`);
    if (minutes > 0) parts.push(`${minutes}분`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}초`);

    return parts.join(' ');
  }
}

