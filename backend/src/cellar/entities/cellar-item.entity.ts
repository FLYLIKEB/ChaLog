import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tea } from '../../teas/entities/tea.entity';

@Entity('cellar_items')
export class CellarItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  teaId: number;

  @ManyToOne(() => Tea)
  @JoinColumn({ name: 'teaId' })
  tea: Tea;

  @Column({ type: 'decimal', precision: 8, scale: 1, default: 0 })
  quantity: number;

  @Column({ type: 'varchar', length: 20, default: 'g' })
  unit: string;

  @Column({ type: 'date', nullable: true })
  openedAt: Date | null;

  @Column({ type: 'date', nullable: true })
  remindAt: Date | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
