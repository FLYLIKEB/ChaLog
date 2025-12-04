import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION') || 'ap-northeast-2';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');

    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET_NAME') || '';

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

  generateKey(prefix: string, filename: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = filename.split('.').pop();
    return `${prefix}/${timestamp}-${randomString}.${extension}`;
  }
}

