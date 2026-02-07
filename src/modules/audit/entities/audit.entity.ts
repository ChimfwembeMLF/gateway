import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audits')
@Index(['auditableType', 'auditableId'])
@Index(['userId'])
@Index(['tenantId'])
export class Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ nullable: true })
  userId: string;

  @Column()
  event: string; // created, updated, deleted

  @Column()
  auditableType: string; // Entity name

  @Column()
  auditableId: string; // Entity id

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @Column({ nullable: true })
  url: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  tags: string;

  @CreateDateColumn()
  createdAt: Date;
}
