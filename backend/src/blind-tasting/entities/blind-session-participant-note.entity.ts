import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BlindSessionParticipant } from './blind-session-participant.entity';
import { BlindSessionRound } from './blind-session-round.entity';
import { Note } from '../../notes/entities/note.entity';

@Entity('blind_session_participant_notes')
export class BlindSessionParticipantNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  participantId: number;

  @ManyToOne(() => BlindSessionParticipant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participantId' })
  participant: BlindSessionParticipant;

  @Column()
  roundId: number;

  @ManyToOne(() => BlindSessionRound, (r) => r.participantNotes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roundId' })
  round: BlindSessionRound;

  @Column({ nullable: true })
  noteId: number | null;

  @ManyToOne(() => Note, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'noteId' })
  note: Note | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;
}
