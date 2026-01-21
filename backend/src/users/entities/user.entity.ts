import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserAuthentication } from './user-authentication.entity';
import { UserOnboardingPreference } from './user-onboarding-preference.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profileImageUrl: string | null;

  @OneToMany(() => UserAuthentication, (auth) => auth.user, { cascade: true })
  authentications: UserAuthentication[];

  @OneToOne(() => UserOnboardingPreference, (preference) => preference.user)
  onboardingPreference?: UserOnboardingPreference;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

