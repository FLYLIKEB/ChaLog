import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_onboarding_preferences')
export class UserOnboardingPreference {
  @PrimaryColumn()
  userId: number;

  @OneToOne(() => User, (user) => user.onboardingPreference, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'json', nullable: true })
  preferredTeaTypes: string[] | null;

  @Column({ type: 'json', nullable: true })
  preferredFlavorTags: string[] | null;

  @Column({ default: false })
  hasCompletedOnboarding: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
