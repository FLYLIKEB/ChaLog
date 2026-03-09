import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TeaSession } from './tea-session.entity';

@Entity('tea_session_steeps')
export class TeaSessionSteep {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  sessionId: number;

  @ManyToOne(() => TeaSession, (session) => session.steeps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: TeaSession;

  @Column()
  steepNumber: number;

  @Column()
  steepDurationSeconds: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  aroma: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  taste: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  color: string | null;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
