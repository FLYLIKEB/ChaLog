import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ImageProcessorService } from './image-processor.service';
import { ImageUploadService } from './image-upload.service';

@Module({
  providers: [S3Service, ImageProcessorService, ImageUploadService],
  exports: [S3Service, ImageProcessorService, ImageUploadService],
})
export class StorageModule {}

