import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { RatingSchema } from './rating-schema.entity';
import { NoteAxisValue } from './note-axis-value.entity';

@Entity('rating_axis')
export class RatingAxis {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  schemaId: number;

  @ManyToOne(() => RatingSchema, (schema) => schema.axes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schemaId' })
  schema: RatingSchema;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  nameKo: string;

  @Column({ type: 'varchar', length: 255 })
  nameEn: string;

  @Column({ type: 'text', nullable: true })
  descriptionKo: string | null;

  @Column({ type: 'text', nullable: true })
  descriptionEn: string | null;

  @Column({ type: 'tinyint' })
  minValue: number;

  @Column({ type: 'tinyint' })
  maxValue: number;

  @Column({ type: 'decimal', precision: 2, scale: 1 })
  stepValue: number;

  @Column({ type: 'int' })
  displayOrder: number;

  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  teaType: string | null;

  @OneToMany(() => NoteAxisValue, (value) => value.axis)
  noteAxisValues: NoteAxisValue[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

