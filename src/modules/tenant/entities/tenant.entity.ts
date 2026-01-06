import { AbstractEntity } from 'src/common/entities/abstract.entity';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tenants')
export class Tenant  extends AbstractEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;


  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  webhookUrl?: string;

  @Column({ nullable: true })
  webhookKey?: string;

  @Column({ default: true })
  isActive: boolean;
}
