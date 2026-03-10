import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Tea } from '../../teas/entities/tea.entity';
import { BlindSessionParticipant } from './blind-session-participant.entity';

export enum BlindSessionStatus {
  ACTIVE = 'active',
  ENDED = 'ended',
}

@Entity('blind_tasting_sessions')
export class BlindTastingSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hostId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column()
  teaId: number;

  @ManyToOne(() => Tea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teaId' })
  tea: Tea;

  @Column({ type: 'enum', enum: BlindSessionStatus, default: BlindSessionStatus.ACTIVE })
  status: BlindSessionStatus;

  @Column({ type: 'varchar', length: 32 })
  inviteCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  endedAt: Date | null;

  @OneToMany(() => BlindSessionParticipant, (p) => p.session, { cascade: true })
  participants: BlindSessionParticipant[];
}
