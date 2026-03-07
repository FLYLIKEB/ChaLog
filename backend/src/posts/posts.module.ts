import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { PostLike } from './entities/post-like.entity';
import { PostBookmark } from './entities/post-bookmark.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Post, PostLike, PostBookmark])],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
