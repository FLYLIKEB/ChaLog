import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { Tag } from '../notes/entities/tag.entity';
import { NoteTag } from '../notes/entities/note-tag.entity';
import { Note } from '../notes/entities/note.entity';
import { NoteLike } from '../notes/entities/note-like.entity';
import { NoteBookmark } from '../notes/entities/note-bookmark.entity';
import { TagFollow } from '../notes/entities/tag-follow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tag, NoteTag, Note, NoteLike, NoteBookmark, TagFollow]),
  ],
  providers: [TagsService],
  controllers: [TagsController],
  exports: [TagsService],
})
export class TagsModule {}
