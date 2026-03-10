import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BlindTastingSession } from './blind-tasting-session.entity';
import { Tea } from '../../teas/entities/tea.entity';
import { BlindSessionParticipantNote } from './blind-session-participant-note.entity';

export enum BlindRoundStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('blind_session_rounds')
export class BlindSessionRound {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne(() => BlindTastingSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: BlindTastingSession;

  @Column()
  teaId: number;

  @ManyToOne(() => Tea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teaId' })
  tea: Tea;

  @Column({ type: 'int' })
  roundOrder: number;

  @Column({
    type: 'enum',
    enum: BlindRoundStatus,
    default: BlindRoundStatus.PENDING,
  })
  status: BlindRoundStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @OneToMany(() => BlindSessionParticipantNote, (pn) => pn.round, { cascade: true })
  participantNotes: BlindSessionParticipantNote[];
}
