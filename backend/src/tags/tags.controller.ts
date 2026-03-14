import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt.guard';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get('popular')
  async getPopularTags(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('category') category: string | undefined,
    @Request() req,
  ) {
    const currentUserId = req.user?.userId;
    return this.tagsService.getPopularTags(limit, currentUserId, category);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('recent')
  async getRecentTags(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Request() req,
  ) {
    const currentUserId = req.user?.userId;
    return this.tagsService.getRecentTags(limit, currentUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('followed')
  async getFollowedTags(@Request() req) {
    return this.tagsService.getFollowedTags(req.user.userId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':name')
  async getTagDetail(@Param('name') name: string, @Request() req) {
    const currentUserId = req.user?.userId;
    return this.tagsService.getTagDetail(name, currentUserId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':name/notes')
  async getNotesByTag(
    @Param('name') name: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Request() req,
  ) {
    const currentUserId = req.user?.userId;
    return this.tagsService.getNotesByTag(name, page, limit, currentUserId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':name/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async followTag(@Param('name') name: string, @Request() req) {
    await this.tagsService.followTag(req.user.userId, name);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':name/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollowTag(@Param('name') name: string, @Request() req) {
    await this.tagsService.unfollowTag(req.user.userId, name);
  }
}
