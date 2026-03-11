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
  UseInterceptors,
  UploadedFile,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { CreateRatingSchemaDto } from './dto/create-rating-schema.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { S3Service } from '../common/storage/s3.service';
import { ImageProcessorService } from '../common/storage/image-processor.service';

@Controller('notes')
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly s3Service: S3Service,
    private readonly imageProcessorService: ImageProcessorService,
  ) {}

  @UseGuards(JwtAuthGuard)
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

      // S3에 원본 업로드
      const key = this.s3Service.generateKey('notes', file.originalname, file.mimetype);
      const url = await this.s3Service.uploadFile(key, processedBuffer, file.mimetype);

      // 썸네일 생성 및 업로드 (실패 시 원본 URL로 폴백)
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
      // 사용자 입력 오류(파일 형식, 크기)는 이미 위에서 처리됨
      // S3 또는 이미지 처리 서버 오류는 500으로 처리
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다.',
      );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createNoteDto: CreateNoteDto) {
    if (!req.user || !req.user.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    
    const parsedUserId = parseInt(req.user.userId, 10);
    if (Number.isNaN(parsedUserId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    
    return this.notesService.create(parsedUserId, createNoteDto);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  findAll(
    @Query('userId') userId?: string,
    @Query('public') isPublic?: string,
    @Query('teaId') teaId?: string,
    @Query('bookmarked') bookmarked?: string,
    @Query('feed') feed?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: any,
  ) {
    const publicFilter = isPublic === 'true' ? true : isPublic === 'false' ? false : undefined;
    const userIdNum = userId ? parseInt(userId, 10) : undefined;
    const teaIdNum = teaId ? parseInt(teaId, 10) : undefined;
    const bookmarkedFilter = bookmarked === 'true' ? true : bookmarked === 'false' ? false : undefined;
    const sortFilter = sort === 'rating' ? 'rating' as const : 'latest' as const;
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : undefined;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : undefined;

    let currentUserId: number | undefined;
    if (req?.user?.userId) {
      const parsedUserId = parseInt(req.user.userId, 10);
      if (!Number.isNaN(parsedUserId)) {
        currentUserId = parsedUserId;
      }
    }

    return this.notesService.findAll(userIdNum, publicFilter, teaIdNum, currentUserId, bookmarkedFilter, feed, sortFilter, pageNum, limitNum);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    
    let userId: number | undefined;
    if (req.user?.userId) {
      const parsedUserId = parseInt(req.user.userId, 10);
      if (Number.isNaN(parsedUserId)) {
        userId = undefined;
      } else {
        userId = parsedUserId;
      }
    }
    
    return this.notesService.findOne(parsedId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Request() req, @Body() updateNoteDto: UpdateNoteDto) {
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
    
    return this.notesService.update(parsedId, parsedUserId, updateNoteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
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
    
    return this.notesService.remove(parsedId, parsedUserId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @Request() req) {
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
    
    return this.notesService.toggleLike(parsedId, parsedUserId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @Post(':id/bookmark')
  toggleBookmark(@Param('id') id: string, @Request() req) {
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
    
    return this.notesService.toggleBookmark(parsedId, parsedUserId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('schemas/active')
  async getActiveSchemas(@Request() req?: { user?: { userId: string } }) {
    const userId = req?.user?.userId ? parseInt(req.user.userId, 10) : undefined;
    return this.notesService.getActiveSchemas(Number.isNaN(userId) ? undefined : userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('schemas/:schemaId/pin')
  async toggleSchemaPin(@Param('schemaId') schemaId: string, @Request() req) {
    if (!req.user?.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    const userId = parseInt(req.user.userId, 10);
    const parsedSchemaId = parseInt(schemaId, 10);
    if (Number.isNaN(userId) || Number.isNaN(parsedSchemaId)) {
      throw new BadRequestException('잘못된 요청입니다.');
    }
    return this.notesService.toggleSchemaPin(userId, parsedSchemaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('schemas')
  async createSchema(@Request() req, @Body() dto: CreateRatingSchemaDto) {
    if (!req.user?.userId) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    const userId = parseInt(req.user.userId, 10);
    if (Number.isNaN(userId)) {
      throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    }
    return this.notesService.createSchema(userId, dto);
  }

  @Get('schemas/:schemaId/axes')
  async getSchemaAxes(@Param('schemaId') schemaId: string) {
    const parsedSchemaId = parseInt(schemaId, 10);
    if (Number.isNaN(parsedSchemaId)) {
      throw new BadRequestException('Invalid schemaId');
    }
    return this.notesService.getSchemaAxes(parsedSchemaId);
  }
}
