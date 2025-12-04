import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tea } from '../../teas/entities/tea.entity';

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

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  rating: number;

  @Column({ type: 'json' })
  ratings: {
    richness: number;
    strength: number;
    smoothness: number;
    clarity: number;
    complexity: number;
  };

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @Column({ type: 'json', nullable: true })
  images: string[] | null;

  @Column({ default: false })
  isPublic: boolean;

  @CreateDateColumn({ precision: 0 })
  createdAt: Date;

  @UpdateDateColumn({ precision: 0 })
  updatedAt: Date;
}

