import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class ImageProcessorService {
  private readonly MAX_WIDTH = 1920;
  private readonly MAX_HEIGHT = 1920;
  private readonly QUALITY = 85;

  async processImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
    // 지원하지 않는 형식은 sharp 호출 전에 검증하여 원본 반환
    if (!this.validateImageType(mimeType)) {
      return buffer;
    }

    let image = sharp(buffer);

    // 이미지 메타데이터 가져오기
    const metadata = await image.metadata();
    const { width, height } = metadata;

    // 리사이징이 필요한지 확인
    if (width && height) {
      const needsResize = width > this.MAX_WIDTH || height > this.MAX_HEIGHT;

      if (needsResize) {
        image = image.resize(this.MAX_WIDTH, this.MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    }

    // 이미지 최적화
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return await image
        .jpeg({ quality: this.QUALITY, mozjpeg: true })
        .toBuffer();
    } else if (mimeType === 'image/png') {
      return await image
        .png({ quality: this.QUALITY, compressionLevel: 9 })
        .toBuffer();
    } else if (mimeType === 'image/webp') {
      return await image
        .webp({ quality: this.QUALITY })
        .toBuffer();
    }
    
    // 위에서 이미 검증했으므로 여기 도달하지 않아야 함
    return buffer;
  }

  validateImageType(mimeType: string): boolean {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return allowedTypes.includes(mimeType);
  }

  validateImageSize(size: number): boolean {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    return size <= MAX_SIZE;
  }
}

