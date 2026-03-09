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
import { Tea } from '../../teas/entities/tea.entity';
import { Note } from '../../notes/entities/note.entity';
import { TeaSessionSteep } from './tea-session-steep.entity';

@Entity('tea_sessions')
export class TeaSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  teaId: number;

  @ManyToOne(() => Tea, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teaId' })
  tea: Tea;

  @Column({ nullable: true })
  noteId: number | null;

  @ManyToOne(() => Note, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'noteId' })
  note: Note | null;

  @OneToMany(() => TeaSessionSteep, (steep) => steep.session, { cascade: true })
  steeps: TeaSessionSteep[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
