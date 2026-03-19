import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { TenantService } from 'src/modules/tenant/tenant.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(
    private readonly tenantService: TenantService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract API key from x-api-key header
    const apiKey = request.headers['x-api-key'];
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }
    
    // Require tenant identifier in x-tenant-id header
    const tenantIdentifier = request.headers['x-tenant-id'];
    if (!tenantIdentifier) {
      throw new UnauthorizedException('Tenant identifier is required');
    }

    this.logger.debug(`Validating API key for tenant: ${tenantIdentifier}`);
    
    // Find tenant by API key
    const tenantByApiKey = await this.tenantService.findByApiKey(apiKey);
    if (!tenantByApiKey) {
      this.logger.warn(`Invalid API key: ${apiKey.substring(0, 10)}...`);
      throw new UnauthorizedException('Invalid API key');
    }

    // Check if tenant is active
    if (!tenantByApiKey.isActive) {
      this.logger.warn(`Tenant ${tenantByApiKey.id} is not active`);
      throw new UnauthorizedException('Tenant is not active');
    }


    // Only allow UUID as tenant identifier
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantIdentifier)) {
      this.logger.warn(`Invalid tenant identifier (must be UUID): ${tenantIdentifier}`);
      throw new UnauthorizedException('Tenant identifier must be a valid UUID');
    }

    if (tenantByApiKey.id !== tenantIdentifier) {
      this.logger.warn(`API key mismatch: key belongs to ${tenantByApiKey.id} but requested ${tenantIdentifier}`);
      throw new UnauthorizedException('API key does not match tenant');
    }

    this.logger.debug(`Access granted for tenant: ${tenantByApiKey.name} (${tenantByApiKey.id})`);
    
    // Attach tenant to request for downstream use
    request.tenant = tenantByApiKey;
    
    return true;
  }
}
