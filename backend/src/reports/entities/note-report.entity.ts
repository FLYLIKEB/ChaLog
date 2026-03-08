import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Note } from '../../notes/entities/note.entity';
import { User } from '../../users/entities/user.entity';

export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  COPYRIGHT = 'copyright',
  OTHER = 'other',
}

export enum ReportStatus {
  PENDING = 'pending',
  DISMISSED = 'dismissed',
  ACTED = 'acted',
}

@Entity('note_reports')
@Unique(['noteId', 'reporterId'])
export class NoteReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  noteId: number;

  @ManyToOne(() => Note, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'noteId' })
  note: Note;

  @Column()
  reporterId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @Column({ type: 'enum', enum: ReportReason })
  reason: ReportReason;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @CreateDateColumn()
  createdAt: Date;
}
