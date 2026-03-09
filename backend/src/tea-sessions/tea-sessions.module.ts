import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeaSession } from './entities/tea-session.entity';
import { TeaSessionSteep } from './entities/tea-session-steep.entity';
import { TeaSessionsService } from './tea-sessions.service';
import { TeaSessionsController } from './tea-sessions.controller';
import { TeasModule } from '../teas/teas.module';
import { NotesModule } from '../notes/notes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TeaSession, TeaSessionSteep]),
    TeasModule,
    NotesModule,
  ],
  providers: [TeaSessionsService],
  controllers: [TeaSessionsController],
  exports: [TeaSessionsService],
})
export class TeaSessionsModule {}
