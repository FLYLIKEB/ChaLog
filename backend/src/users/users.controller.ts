import {
  Controller,
  Get,
  Param,
  BadRequestException,
  UseGuards,
  Post,
  Patch,
  Body,
  UseInterceptors,
  UploadedFile,
  Request,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { AuthGuard } from '@nestjs/passport';
import { S3Service } from '../common/storage/s3.service';
import { ImageProcessorService } from '../common/storage/image-processor.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
    private readonly imageProcessorService: ImageProcessorService,
  ) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    
    return this.usersService.findOne(parsedId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('profile-image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadProfileImage(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    // 파일 타입 검증
    if (!this.imageProcessorService.validateImageType(file.mimetype)) {
      throw new BadRequestException('지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP만 지원합니다.');
    }

    // 파일 크기 검증
    if (!this.imageProcessorService.validateImageSize(file.size)) {
      throw new BadRequestException('파일 크기는 10MB를 초과할 수 없습니다.');
    }

    try {
      // 이미지 처리 (리사이징, 최적화)
      const processedBuffer = await this.imageProcessorService.processImage(
        file.buffer,
        file.mimetype,
      );

      // S3에 업로드 (prefix를 'profiles'로 설정)
      const key = this.s3Service.generateKey('profiles', file.originalname, file.mimetype);
      const url = await this.s3Service.uploadFile(key, processedBuffer, file.mimetype);

      return { url };
    } catch (error) {
      // 사용자 입력 오류(파일 형식, 크기)는 이미 위에서 처리됨
      // S3 또는 이미지 처리 서버 오류는 500으로 처리
      if (error instanceof BadRequestException) {
        throw error;
      }
      // 내부 오류 상세 정보는 로깅하고, 클라이언트에는 일반적인 메시지만 반환
      this.logger.error('프로필 이미지 업로드 실패:', error instanceof Error ? error.message : error);
      throw new InternalServerErrorException('이미지 업로드 중 오류가 발생했습니다.');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateUserDto: UpdateUserDto) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    
    const parsedId = parseInt(id, 10);
    const parsedUserId = parseInt(req.user.userId, 10);
    
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    
    return this.usersService.update(parsedId, parsedUserId, updateUserDto);
  }
}
