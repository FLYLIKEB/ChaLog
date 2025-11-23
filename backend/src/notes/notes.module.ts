import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { Note } from './entities/note.entity';
import { TeasModule } from '../teas/teas.module';

@Module({
  imports: [TypeOrmModule.forFeature([Note]), TeasModule],
  providers: [NotesService],
  controllers: [NotesController],
})
export class NotesModule {}
