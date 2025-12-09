import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Note } from './note.entity';
import { User } from '../../users/entities/user.entity';

@Entity('note_bookmarks')
@Unique(['noteId', 'userId'])
@Index(['noteId'])
@Index(['userId'])
export class NoteBookmark {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  noteId: number;

  @ManyToOne(() => Note, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'noteId' })
  note: Note;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn({ precision: 0 })
  createdAt: Date;
}




