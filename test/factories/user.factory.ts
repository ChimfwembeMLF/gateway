import { User } from 'src/modules/user/entities/user.entity';
import { RoleType } from 'src/common/enums/role-type.enum';

export class UserFactory {
  static create(overrides?: Partial<User>): User {
    const user = new User();
    user.id = overrides?.id || 'test-user-id';
    user.tenantId = overrides?.tenantId || 'test-tenant-id';
    user.email = overrides?.email || 'test@example.com';
    user.password = overrides?.password || 'hashedPassword123';
    user.role = overrides?.role || RoleType.USER;
    user.isActive = overrides?.isActive ?? true;
    user.createdAt = overrides?.createdAt || new Date();
    user.updatedAt = overrides?.updatedAt || new Date();
    return user;
  }

  static createAdmin(overrides?: Partial<User>): User {
    return UserFactory.create({
      ...overrides,
      role: RoleType.ADMIN,
      email: overrides?.email || 'admin@example.com',
    });
  }

  static createSuperAdmin(overrides?: Partial<User>): User {
    return UserFactory.create({
      ...overrides,
      role: RoleType.SUPER_ADMIN,
      email: overrides?.email || 'superadmin@example.com',
    });
  }
}
