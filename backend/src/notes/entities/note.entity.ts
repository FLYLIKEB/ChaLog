import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tea } from '../../teas/entities/tea.entity';
import { NoteTag } from './note-tag.entity';
import { RatingSchema } from './rating-schema.entity';
import { NoteAxisValue } from './note-axis-value.entity';
import { NoteSchema } from './note-schema.entity';

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

  @Column({ type: 'varchar', length: 50, nullable: true })
  appearance: string | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ type: 'json', nullable: true })
  images: string[] | null;

  @Column({ type: 'json', nullable: true })
  imageThumbnails: string[] | null;

  @Column({ default: false })
  isPublic: boolean;

  @OneToMany(() => NoteTag, (noteTag) => noteTag.note, { cascade: true })
  noteTags: NoteTag[];

  @OneToMany(() => NoteAxisValue, (axisValue) => axisValue.note, { cascade: true })
  axisValues: NoteAxisValue[];

  @OneToMany(() => NoteSchema, (ns) => ns.note, { cascade: true })
  noteSchemas: NoteSchema[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

