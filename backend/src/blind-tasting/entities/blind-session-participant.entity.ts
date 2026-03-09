import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { BlindTastingSession } from './blind-tasting-session.entity';
import { User } from '../../users/entities/user.entity';
import { Note } from '../../notes/entities/note.entity';

@Entity('blind_session_participants')
export class BlindSessionParticipant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne(() => BlindTastingSession, (s) => s.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: BlindTastingSession;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  noteId: number | null;

  @ManyToOne(() => Note, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'noteId' })
  note: Note | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt: Date;
}
