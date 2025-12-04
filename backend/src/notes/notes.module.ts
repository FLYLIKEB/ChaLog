import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { Note } from './entities/note.entity';
import { Tag } from './entities/tag.entity';
import { NoteTag } from './entities/note-tag.entity';
import { TeasModule } from '../teas/teas.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Note, Tag, NoteTag]), TeasModule, StorageModule],
  providers: [NotesService],
  controllers: [NotesController],
})
export class NotesModule {}
