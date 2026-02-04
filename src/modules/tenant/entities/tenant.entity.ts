import { AbstractEntity } from 'src/common/entities/abstract.entity';
import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('tenants')
@Index(['name'])
@Index(['slug'])
@Index(['apiKey'])
export class Tenant  extends AbstractEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ unique: true })
  apiKey: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  webhookUrl?: string;

  @Column({ nullable: true })
  webhookKey?: string;

  @Column({ default: true })
  isActive: boolean;
}
