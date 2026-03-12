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
import { ImageUploadService } from '../common/storage/image-upload.service';
import { ValidatedUserId } from '../common/decorators/validated-user-id.decorator';

@Controller('notes')
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly imageUploadService: ImageUploadService,
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

    try {
      const { urls, thumbnailUrl } = await this.imageUploadService.uploadNoteImages([file]);
      return { url: urls[0], thumbnailUrl };
    } catch (error) {
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
  create(@ValidatedUserId() userId: number, @Body() createNoteDto: CreateNoteDto) {
    return this.notesService.create(userId, createNoteDto);
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
  update(@Param('id') id: string, @ValidatedUserId() userId: number, @Body() updateNoteDto: UpdateNoteDto) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    return this.notesService.update(parsedId, userId, updateNoteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @ValidatedUserId() userId: number) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    return this.notesService.remove(parsedId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @Post(':id/like')
  toggleLike(@Param('id') id: string, @ValidatedUserId() userId: number) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    return this.notesService.toggleLike(parsedId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @Post(':id/bookmark')
  toggleBookmark(@Param('id') id: string, @ValidatedUserId() userId: number) {
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId)) {
      throw new BadRequestException('Invalid id');
    }
    return this.notesService.toggleBookmark(parsedId, userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('schemas/active')
  async getActiveSchemas(@Request() req?: { user?: { userId: string } }) {
    const userId = req?.user?.userId ? parseInt(req.user.userId, 10) : undefined;
    return this.notesService.getActiveSchemas(Number.isNaN(userId) ? undefined : userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('schemas/:schemaId/pin')
  async toggleSchemaPin(@Param('schemaId') schemaId: string, @ValidatedUserId() userId: number) {
    const parsedSchemaId = parseInt(schemaId, 10);
    if (Number.isNaN(parsedSchemaId)) {
      throw new BadRequestException('잘못된 요청입니다.');
    }
    return this.notesService.toggleSchemaPin(userId, parsedSchemaId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('schemas')
  async createSchema(@ValidatedUserId() userId: number, @Body() dto: CreateRatingSchemaDto) {
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
