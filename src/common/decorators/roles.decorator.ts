import { SetMetadata } from '@nestjs/common';
import type { RoleType } from '../enums/role-type.enum';

export const Roles = (...roles: RoleType[]) => SetMetadata('roles', roles);
