import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tea } from '../../teas/entities/tea.entity';
import { NoteTag } from './note-tag.entity';
import { RatingSchema } from './rating-schema.entity';
import { NoteAxisValue } from './note-axis-value.entity';

@Entity('notes')
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teaId: number;

  @ManyToOne(() => Tea)
  @JoinColumn({ name: 'teaId' })
  tea: Tea;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  schemaId: number;

  @ManyToOne(() => RatingSchema)
  @JoinColumn({ name: 'schemaId' })
  schema: RatingSchema;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  overallRating: number | null;

  @Column({ type: 'boolean', default: true })
  isRatingIncluded: boolean;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ type: 'json', nullable: true })
  images: string[] | null;

  @Column({ default: false })
  isPublic: boolean;

  @OneToMany(() => NoteTag, (noteTag) => noteTag.note, { cascade: true })
  noteTags: NoteTag[];

  @OneToMany(() => NoteAxisValue, (axisValue) => axisValue.note, { cascade: true })
  axisValues: NoteAxisValue[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

