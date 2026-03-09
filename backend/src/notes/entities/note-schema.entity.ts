import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Note } from './note.entity';
import { RatingSchema } from './rating-schema.entity';

@Entity('note_schemas')
@Unique('UQ_note_schemas', ['noteId', 'schemaId'])
export class NoteSchema {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  noteId: number;

  @ManyToOne(() => Note, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'noteId' })
  note: Note;

  @Column()
  schemaId: number;

  @ManyToOne(() => RatingSchema, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schemaId' })
  schema: RatingSchema;

  @CreateDateColumn()
  createdAt: Date;
}
