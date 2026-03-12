import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PostLike } from './post-like.entity';
import { PostBookmark } from './post-bookmark.entity';
import { PostImage } from './post-image.entity';
import { Note } from '../../notes/entities/note.entity';

export const PostCategory = {
  BREWING_QUESTION: 'brewing_question',
  RECOMMENDATION: 'recommendation',
  DISCUSSION: 'discussion',
  TEA_REVIEW: 'tea_review',
  TOOL_REVIEW: 'tool_review',
  TEA_ROOM_REVIEW: 'tea_room_review',
  ANNOUNCEMENT: 'announcement',
  BUG_REPORT: 'bug_report',
} as const;

export type PostCategory = (typeof PostCategory)[keyof typeof PostCategory];

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

  @OneToMany(() => PostImage, (image) => image.post, { cascade: true })
  images: PostImage[];

  @ManyToMany(() => Note)
  @JoinTable({
    name: 'post_note_tags',
    joinColumn: { name: 'postId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'noteId', referencedColumnName: 'id' },
  })
  taggedNotes: Note[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
