import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  BadRequestException,
  InternalServerErrorException,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostCategory } from './entities/post.entity';
import { S3Service } from '../common/storage/s3.service';
import { ImageProcessorService } from '../common/storage/image-processor.service';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly s3Service: S3Service,
    private readonly imageProcessorService: ImageProcessorService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('images')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadImage(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }

    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    if (!this.imageProcessorService.validateImageType(file.mimetype)) {
      throw new BadRequestException('지원하지 않는 이미지 형식입니다. JPEG, PNG, WebP만 지원합니다.');
    }

    if (!this.imageProcessorService.validateImageSize(file.size)) {
      throw new BadRequestException('파일 크기는 10MB를 초과할 수 없습니다.');
    }

    try {
      const processedBuffer = await this.imageProcessorService.processImage(
        file.buffer,
        file.mimetype,
      );

      const key = this.s3Service.generateKey('posts', file.originalname, file.mimetype);
      const url = await this.s3Service.uploadFile(key, processedBuffer, file.mimetype);

      let thumbnailUrl = url;
      try {
        const thumbnailBuffer = await this.imageProcessorService.generateThumbnail(
          file.buffer,
          file.mimetype,
        );
        const thumbnailKey = this.s3Service.getThumbnailKey(key);
        thumbnailUrl = await this.s3Service.uploadFile(
          thumbnailKey,
          thumbnailBuffer,
          file.mimetype,
        );
      } catch {
        // 썸네일 생성/업로드 실패 시 원본 URL 사용
      }

      return { url, thumbnailUrl };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error('Image upload failed:', error);
      throw new InternalServerErrorException('이미지 업로드 중 오류가 발생했습니다.');
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Request() req, @Body() dto: CreatePostDto) {
    const userId = parseInt(req.user.userId, 10);
    if (isNaN(userId)) throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    return this.postsService.create(userId, dto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const categoryEnum = Object.values(PostCategory).includes(category as PostCategory)
      ? (category as PostCategory)
      : undefined;
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 50) : 20;
    const currentUserId = req?.user?.userId ? parseInt(req.user.userId, 10) : undefined;
    return this.postsService.findAll(categoryEnum, pageNum, limitNum, currentUserId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    const postId = parseInt(id, 10);
    if (isNaN(postId)) throw new BadRequestException('Invalid id');
    const currentUserId = req?.user?.userId ? parseInt(req.user.userId, 10) : undefined;
    const post = await this.postsService.findOne(postId, currentUserId);
    await this.postsService.incrementViewCount(postId);
    return post;
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdatePostDto) {
    const postId = parseInt(id, 10);
    const userId = parseInt(req.user.userId, 10);
    if (isNaN(postId)) throw new BadRequestException('Invalid id');
    if (isNaN(userId)) throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    return this.postsService.update(postId, userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    const postId = parseInt(id, 10);
    const userId = parseInt(req.user.userId, 10);
    if (isNaN(postId)) throw new BadRequestException('Invalid id');
    if (isNaN(userId)) throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    return this.postsService.remove(postId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @Request() req) {
    const postId = parseInt(id, 10);
    const userId = parseInt(req.user.userId, 10);
    if (isNaN(postId)) throw new BadRequestException('Invalid id');
    if (isNaN(userId)) throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    return this.postsService.toggleLike(postId, userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/bookmark')
  toggleBookmark(@Param('id') id: string, @Request() req) {
    const postId = parseInt(id, 10);
    const userId = parseInt(req.user.userId, 10);
    if (isNaN(postId)) throw new BadRequestException('Invalid id');
    if (isNaN(userId)) throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    return this.postsService.toggleBookmark(postId, userId);
  }
}
