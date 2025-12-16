import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleType } from 'src/common/enums/role-type.enum';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || (user.role !== RoleType.ADMIN && user.role !== RoleType.SUPER_ADMIN)) {
      throw new ForbiddenException('Admin access only');
    }
    return true;
  }
}
