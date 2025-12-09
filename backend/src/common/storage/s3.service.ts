import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'ap-northeast-2';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');

    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || '';
    
    // S3 버킷이 설정되지 않은 경우, 이미지 업로드 시 에러가 발생하므로 경고는 출력하지 않음

    this.s3Client = new S3Client({
      region,
      credentials: accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey,
          }
        : undefined,
      ...(endpoint && { endpoint }),
    });
  }

  async uploadFile(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!this.bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다.');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
    });

    await this.s3Client.send(command);

    // S3 URL 생성
    const region = this.configService.get<string>('AWS_REGION') || 'ap-northeast-2';
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');
    
    if (endpoint) {
      // 커스텀 엔드포인트 사용 (로컬 개발용)
      return `${endpoint}/${this.bucketName}/${key}`;
    } else {
      // 표준 S3 URL
      return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다.');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * MIME 타입을 확장자로 변환하는 맵
   */
  private readonly mimeToExtension: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
  };

  /**
   * 파일명과 MIME 타입에서 확장자를 추출
   * 파일명에 확장자가 없거나 유효하지 않으면 MIME 타입에서 추출
   */
  private getExtension(filename: string, mimeType?: string): string {
    // MIME 타입이 있으면 우선적으로 사용 (가장 신뢰할 수 있는 정보)
    if (mimeType) {
      const ext = this.mimeToExtension[mimeType.toLowerCase()];
      if (ext) {
        return ext;
      }
    }

    // 파일명에서 확장자 추출 시도
    const parts = filename.split('.');
    if (parts.length > 1) {
      const ext = parts.pop()?.toLowerCase();
      // 확장자가 유효한지 확인
      // 1. 빈 문자열이 아님
      // 2. 파일명 전체가 아님 (점이 있는 경우)
      // 3. 일반적인 이미지 확장자 목록에 포함되어 있음 (추가 검증)
      if (ext && ext.length > 0 && ext.length < filename.length) {
        const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'];
        if (validExtensions.includes(ext)) {
          return ext;
        }
      }
    }

    // 기본값: jpg (가장 일반적인 이미지 형식)
    return 'jpg';
  }

  generateKey(prefix: string, filename: string, mimeType?: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = this.getExtension(filename, mimeType);
    return `${prefix}/${timestamp}-${randomString}.${extension}`;
  }
}

