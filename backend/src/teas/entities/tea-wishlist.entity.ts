import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Tea } from './tea.entity';
import { User } from '../../users/entities/user.entity';

@Entity('tea_wishlists')
@Unique(['teaId', 'userId'])
@Index(['teaId'])
@Index(['userId'])
export class TeaWishlist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teaId: number;

  @ManyToOne(() => Tea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teaId' })
  tea: Tea;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
