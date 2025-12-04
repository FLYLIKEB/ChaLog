import { Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { ImageProcessorService } from './image-processor.service';

@Module({
  providers: [S3Service, ImageProcessorService],
  exports: [S3Service, ImageProcessorService],
})
export class StorageModule {}

