import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { User } from '../users/entities/user.entity';
import { Note } from '../notes/entities/note.entity';
import { Post } from '../posts/entities/post.entity';
import { NoteReport } from '../reports/entities/note-report.entity';
import { PostReport } from '../reports/entities/post-report.entity';
import { Tea } from '../teas/entities/tea.entity';
import { Seller } from '../teas/entities/seller.entity';
import { Tag } from '../notes/entities/tag.entity';
import { Comment } from '../comments/entities/comment.entity';
import { AuditLog } from './entities/audit-log.entity';
import { NotesModule } from '../notes/notes.module';
import { PostsModule } from '../posts/posts.module';
import { CommentsModule } from '../comments/comments.module';
import { FollowsModule } from '../follows/follows.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Note,
      Post,
      NoteReport,
      PostReport,
      Tea,
      Seller,
      Tag,
      Comment,
      AuditLog,
    ]),
    NotesModule,
    PostsModule,
    CommentsModule,
    FollowsModule,
    UsersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
