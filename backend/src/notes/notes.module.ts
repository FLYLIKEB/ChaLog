import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { Note } from './entities/note.entity';
import { Tag } from './entities/tag.entity';
import { NoteTag } from './entities/note-tag.entity';
import { NoteLike } from './entities/note-like.entity';
import { NoteBookmark } from './entities/note-bookmark.entity';
import { RatingSchema } from './entities/rating-schema.entity';
import { RatingAxis } from './entities/rating-axis.entity';
import { NoteAxisValue } from './entities/note-axis-value.entity';
import { TagFollow } from './entities/tag-follow.entity';
import { UserSchemaPin } from './entities/user-schema-pin.entity';
import { TeasModule } from '../teas/teas.module';
import { StorageModule } from '../common/storage/storage.module';
import { FollowsModule } from '../follows/follows.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Note, Tag, NoteTag, NoteLike, NoteBookmark, RatingSchema, RatingAxis, NoteAxisValue, TagFollow, UserSchemaPin]),
    TeasModule,
    StorageModule,
    FollowsModule,
    NotificationsModule,
  ],
  providers: [NotesService],
  controllers: [NotesController],
})
export class NotesModule {}
