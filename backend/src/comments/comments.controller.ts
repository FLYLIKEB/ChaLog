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
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('posts/:postId/comments')
  findByPost(@Param('postId') postId: string) {
    const id = parseInt(postId, 10);
    if (isNaN(id)) throw new BadRequestException('Invalid postId');
    return this.commentsService.findByPost(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('posts/:postId/comments')
  createComment(
    @Param('postId') postId: string,
    @Request() req,
    @Body() dto: CreateCommentDto,
  ) {
    const id = parseInt(postId, 10);
    const userId = parseInt(req.user.userId, 10);
    if (isNaN(id)) throw new BadRequestException('Invalid postId');
    if (isNaN(userId)) throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    return this.commentsService.create(id, userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('comments/:id')
  updateComment(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateCommentDto,
  ) {
    const commentId = parseInt(id, 10);
    const userId = parseInt(req.user.userId, 10);
    if (isNaN(commentId)) throw new BadRequestException('Invalid id');
    if (isNaN(userId)) throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    return this.commentsService.update(commentId, userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeComment(@Param('id') id: string, @Request() req) {
    const commentId = parseInt(id, 10);
    const userId = parseInt(req.user.userId, 10);
    if (isNaN(commentId)) throw new BadRequestException('Invalid id');
    if (isNaN(userId)) throw new BadRequestException('인증 정보가 올바르지 않습니다.');
    return this.commentsService.remove(commentId, userId);
  }
}
