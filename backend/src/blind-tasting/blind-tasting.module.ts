import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlindTastingSession } from './entities/blind-tasting-session.entity';
import { BlindSessionParticipant } from './entities/blind-session-participant.entity';
import { BlindSessionRound } from './entities/blind-session-round.entity';
import { BlindSessionParticipantNote } from './entities/blind-session-participant-note.entity';
import { BlindTastingService } from './blind-tasting.service';
import { BlindTastingController } from './blind-tasting.controller';
import { TeasModule } from '../teas/teas.module';
import { NotesModule } from '../notes/notes.module';
import { Note } from '../notes/entities/note.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlindTastingSession,
      BlindSessionParticipant,
      BlindSessionRound,
      BlindSessionParticipantNote,
      Note,
    ]),
    TeasModule,
    NotesModule,
  ],
  providers: [BlindTastingService],
  controllers: [BlindTastingController],
  exports: [BlindTastingService],
})
export class BlindTastingModule {}
