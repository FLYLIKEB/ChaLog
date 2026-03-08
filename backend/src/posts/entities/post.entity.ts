import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PostLike } from './post-like.entity';
import { PostBookmark } from './post-bookmark.entity';

export enum PostCategory {
  BREWING_QUESTION = 'brewing_question',
  RECOMMENDATION = 'recommendation',
  TOOL = 'tool',
  TEA_ROOM_REVIEW = 'tea_room_review',
  ANNOUNCEMENT = 'announcement',
  BUG_REPORT = 'bug_report',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 200 })
  title: string;

  @Column('text')
  content: string;

  @Column({ type: 'enum', enum: PostCategory })
  category: PostCategory;

  @Column({ default: false })
  isSponsored: boolean;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ type: 'varchar', length: 300, nullable: true })
  sponsorNote: string | null;

  @Column({ default: 0 })
  viewCount: number;

  @OneToMany(() => PostLike, (like) => like.post)
  likes: PostLike[];

  @OneToMany(() => PostBookmark, (bookmark) => bookmark.post)
  bookmarks: PostBookmark[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
