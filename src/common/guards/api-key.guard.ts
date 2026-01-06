import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/modules/user/users.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // Accept API key from Authorization: Bearer <api_key> or x-api-key header
    let apiKey = null;
    const authHeader = request.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.slice(7).trim();
    } else if (request.headers['x-api-key']) {
      apiKey = request.headers['x-api-key'];
    }
    if (!apiKey) {
      throw new UnauthorizedException('API key missing');
    }
    // Require tenantId in the request (e.g., from a header or query param)
    const tenantId = request.headers['x-tenant-id'] || request.query.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant ID missing');
    }
    const user = await this.usersService['userRepository'].findOne({ where: { apiKey, tenantId } });
    if (!user) {
      throw new UnauthorizedException('Invalid API key or tenant');
    }
    request.user = user;
    return true;
  }
}
