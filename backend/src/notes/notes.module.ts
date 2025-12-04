import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { Note } from './entities/note.entity';
import { TeasModule } from '../teas/teas.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([Note]), TeasModule, StorageModule],
  providers: [NotesService],
  controllers: [NotesController],
})
export class NotesModule {}
