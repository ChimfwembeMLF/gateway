import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { RoleType } from 'src/common/enums/role-type.enum';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || user.role !== RoleType.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin access only');
    }
    return true;
  }
}
