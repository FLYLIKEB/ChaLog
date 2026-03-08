import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RatingSchema } from './rating-schema.entity';

@Entity('user_schema_pin')
@Unique('UQ_user_schema_pin', ['userId', 'schemaId'])
export class UserSchemaPin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  schemaId: number;

  @ManyToOne(() => RatingSchema, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schemaId' })
  schema: RatingSchema;

  @CreateDateColumn()
  createdAt: Date;
}
