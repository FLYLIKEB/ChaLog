import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TeaSession } from './tea-session.entity';
import { SteepDataV1 } from '../types/steep-data';

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

  @Column({ type: 'json', nullable: true })
  data: SteepDataV1 | null;

  @CreateDateColumn()
  createdAt: Date;
}
