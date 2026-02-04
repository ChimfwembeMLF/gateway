import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from './roles.decorator';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import type { RoleType } from '../enums/role-type.enum';

export function Auth(roles?: RoleType[]) {
  return applyDecorators(
    UseGuards(AuthGuard(), RolesGuard),
    ApiBearerAuth(),
    ...(roles && roles.length ? [Roles(...roles)] : [])
  );
}
