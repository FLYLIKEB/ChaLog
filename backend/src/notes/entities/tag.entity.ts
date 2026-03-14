import { BaseEntity, Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { NoteTag } from './note-tag.entity';

export type TagCategory = 'general' | 'flavor';

@Entity('tags')
@Index(['name'], { unique: true })
export class Tag extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'general' })
  category: TagCategory;

  @OneToMany(() => NoteTag, (noteTag) => noteTag.tag)
  noteTags: NoteTag[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

