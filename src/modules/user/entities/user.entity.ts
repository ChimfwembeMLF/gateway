import { AbstractEntity } from 'src/common/entities/abstract.entity';
import { RoleType } from 'src/common/enums/role-type.enum';
import { Entity, Column } from 'typeorm';

@Entity('users')
export class User extends AbstractEntity {
  // tenantId is required for tenant scoping
  @Column()
  tenantId: string;

  // username is unique per tenant (enforced in service, not DB)
  @Column()
  username: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  firstName?: string;

  @Column({ nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  profileImage?: string;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: RoleType, default: RoleType.USER })
  role: RoleType;

  @Column({ unique: true, nullable: true })
  apiKey?: string;
}
