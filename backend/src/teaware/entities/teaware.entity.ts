import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum TeawareCategory {
  ZISHA_HU = 'ZISHA_HU',
  GAIWAN = 'GAIWAN',
  GONGDAO_BEI = 'GONGDAO_BEI',
  CUP = 'CUP',
  FAIRNESS_CUP = 'FAIRNESS_CUP',
  TEA_TRAY = 'TEA_TRAY',
  OTHER = 'OTHER',
}

@Entity('teaware')
export class Teaware {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: TeawareCategory })
  category: TeawareCategory;

  @Column({ type: 'decimal', precision: 6, scale: 1, nullable: true })
  capacity: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  material: string | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
