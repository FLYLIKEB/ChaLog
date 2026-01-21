import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Index, Unique } from 'typeorm';
import { Note } from './note.entity';
import { Tag } from './tag.entity';

@Entity('note_tags')
@Unique(['noteId', 'tagId'])
@Index(['noteId'])
@Index(['tagId'])
export class NoteTag {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  noteId: number;

  @ManyToOne(() => Note, (note) => note.noteTags, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'noteId' })
  note: Note;

  @Column()
  tagId: number;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag: Tag;

  @CreateDateColumn()
  createdAt: Date;
}

