import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum AuditAction {
  REPORT_DISMISS = 'report_dismiss',
  REPORT_ACTION = 'report_action',
  NOTE_DELETE = 'note_delete',
  POST_DELETE = 'post_delete',
  COMMENT_DELETE = 'comment_delete',
  USER_SUSPEND = 'user_suspend',
  USER_PROMOTE = 'user_promote',
  USER_DELETE = 'user_delete',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  adminId: number;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'varchar', length: 50, nullable: true })
  targetType: string | null;

  @Column({ type: 'int', nullable: true })
  targetId: number | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;
}
