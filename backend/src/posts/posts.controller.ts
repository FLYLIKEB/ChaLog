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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostCategory } from './entities/post.entity';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

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
