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

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profileImageUrl: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  instagramUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  blogUrl: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: 'datetime', nullable: true })
  bannedAt: Date | null;

  @Column({ type: 'boolean', default: true })
  isProfilePublic: boolean;

  @OneToMany(() => UserAuthentication, (auth) => auth.user, { cascade: true })
  authentications: UserAuthentication[];

  @OneToOne(() => UserOnboardingPreference, (preference) => preference.user)
  onboardingPreference?: UserOnboardingPreference;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

