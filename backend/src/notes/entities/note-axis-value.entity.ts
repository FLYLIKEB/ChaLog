import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Note } from './note.entity';
import { RatingAxis } from './rating-axis.entity';

@Entity('note_axis_value')
@Index(['noteId', 'axisId'], { unique: true })
@Index(['axisId'])
@Index(['axisId', 'valueNumeric'])
export class NoteAxisValue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  noteId: number;

  @ManyToOne(() => Note, (note) => note.axisValues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'noteId' })
  note: Note;

  @Column()
  axisId: number;

  @ManyToOne(() => RatingAxis, (axis) => axis.noteAxisValues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'axisId' })
  axis: RatingAxis;

  @Column({ type: 'decimal', precision: 3, scale: 1 })
  valueNumeric: number;

  @CreateDateColumn({ precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ precision: 0 })
  updatedAt: Date;
}

