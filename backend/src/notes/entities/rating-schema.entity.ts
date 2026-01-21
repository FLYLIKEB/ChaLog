import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RatingAxis } from './rating-axis.entity';

@Entity('rating_schema')
export class RatingSchema {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Column({ type: 'varchar', length: 255 })
  nameKo: string;

  @Column({ type: 'varchar', length: 255 })
  nameEn: string;

  @Column({ type: 'text', nullable: true })
  descriptionKo: string | null;

  @Column({ type: 'text', nullable: true })
  descriptionEn: string | null;

  @Column({ type: 'tinyint' })
  overallMinValue: number;

  @Column({ type: 'tinyint' })
  overallMaxValue: number;

  @Column({ type: 'decimal', precision: 2, scale: 1 })
  overallStep: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => RatingAxis, (axis) => axis.schema)
  axes: RatingAxis[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

