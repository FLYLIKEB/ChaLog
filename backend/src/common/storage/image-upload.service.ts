import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ImageProcessorService } from './image-processor.service';

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);
  private readonly MAX_NOTE_IMAGES = 5;

  constructor(
    private readonly s3Service: S3Service,
    private readonly imageProcessorService: ImageProcessorService,
  ) {}

  async uploadProfileImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    if (!this.imageProcessorService.validateImageType(file.mimetype)) {
      throw new BadRequestException('지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP만 지원합니다.');
    }

    if (!this.imageProcessorService.validateImageSize(file.size)) {
      throw new BadRequestException('파일 크기는 10MB를 초과할 수 없습니다.');
    }

    const processedBuffer = await this.imageProcessorService.processImage(
      file.buffer,
      file.mimetype,
    );

    const key = this.s3Service.generateKey('profiles', file.originalname, file.mimetype);
    return this.s3Service.uploadFile(key, processedBuffer, file.mimetype);
  }

  async uploadNoteImages(
    files: Express.Multer.File[],
  ): Promise<{ urls: string[]; thumbnailUrl?: string }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    if (files.length > this.MAX_NOTE_IMAGES) {
      throw new BadRequestException(`이미지는 최대 ${this.MAX_NOTE_IMAGES}장까지 업로드할 수 있습니다.`);
    }

    for (const file of files) {
      if (!this.imageProcessorService.validateImageType(file.mimetype)) {
        throw new BadRequestException('지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP만 지원합니다.');
      }
      if (!this.imageProcessorService.validateImageSize(file.size)) {
        throw new BadRequestException('파일 크기는 10MB를 초과할 수 없습니다.');
      }
    }

    const urls: string[] = [];
    let thumbnailUrl: string | undefined;

    for (const file of files) {
      const processedBuffer = await this.imageProcessorService.processImage(
        file.buffer,
        file.mimetype,
      );

      const key = this.s3Service.generateKey('notes', file.originalname, file.mimetype);
      const url = await this.s3Service.uploadFile(key, processedBuffer, file.mimetype);
      urls.push(url);

      if (thumbnailUrl === undefined) {
        try {
          const thumbnailBuffer = await this.imageProcessorService.generateThumbnail(
            file.buffer,
            file.mimetype,
          );
          const thumbnailKey = this.s3Service.getThumbnailKey(key);
          thumbnailUrl = await this.s3Service.uploadFile(thumbnailKey, thumbnailBuffer, file.mimetype);
        } catch (err) {
          this.logger.warn(`썸네일 생성/업로드 실패, 원본 URL 사용: ${err instanceof Error ? err.message : String(err)}`);
          thumbnailUrl = url;
        }
      }
    }

    return { urls, thumbnailUrl };
  }
}
