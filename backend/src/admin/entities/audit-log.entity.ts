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
  POST_UPDATE = 'post_update',
  POST_DELETE = 'post_delete',
  COMMENT_DELETE = 'comment_delete',
  USER_SUSPEND = 'user_suspend',
  USER_PROMOTE = 'user_promote',
  USER_DELETE = 'user_delete',
  TEA_CREATE = 'tea_create',
  TEA_UPDATE = 'tea_update',
  TEA_DELETE = 'tea_delete',
  SELLER_CREATE = 'seller_create',
  SELLER_UPDATE = 'seller_update',
  SELLER_DELETE = 'seller_delete',
  TAG_CREATE = 'tag_create',
  TAG_UPDATE = 'tag_update',
  TAG_DELETE = 'tag_delete',
  TAG_MERGE = 'tag_merge',
  USER_UPDATE = 'user_update',
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
