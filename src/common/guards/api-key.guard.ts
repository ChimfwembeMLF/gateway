import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UsersService } from 'src/modules/user/users.service';
import { TenantService } from 'src/modules/tenant/tenant.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly tenantService: TenantService,
  ) {}

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
    let tenantIdentifier = request.headers['x-tenant-id'] || request.query.tenantId;
    if (!tenantIdentifier) {
      throw new UnauthorizedException('Tenant ID missing');
    }

    // Resolve tenant identifier to tenant ID (supports both UUID and tenant name)
    let tenantId = tenantIdentifier as string;
    this.logger.debug(`Attempting to resolve tenant identifier: ${tenantIdentifier}`);
    const tenant = await this.tenantService.findByNameOrId(tenantIdentifier as string);
    if (tenant) {
      tenantId = tenant.id;
      this.logger.debug(`Resolved tenant "${tenantIdentifier}" to ID: ${tenantId}`);
    } else {
      this.logger.warn(`Tenant not found with identifier: ${tenantIdentifier}`);
      throw new UnauthorizedException('Tenant not found');
    }

    this.logger.debug(`Looking up API key: ${apiKey.substring(0, 10)}... with tenantId: ${tenantId}`);
    const user = await this.usersService.findByApiKey(apiKey, tenantId);
    if (!user) {
      this.logger.warn(`User not found for API key and tenantId: ${tenantId}`);
      throw new UnauthorizedException('Invalid API key or tenant');
    }
    this.logger.debug(`User found: ${user.username}, setting tenantId to: ${tenantId}`);
    request.user = user;
    return true;
  }
}
