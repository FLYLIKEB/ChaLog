import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Unique, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tag } from './tag.entity';

@Entity('tag_follows')
@Unique(['userId', 'tagId'])
@Index(['userId'])
@Index(['tagId'])
export class TagFollow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  tagId: number;

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag: Tag;

  @CreateDateColumn()
  createdAt: Date;
}
