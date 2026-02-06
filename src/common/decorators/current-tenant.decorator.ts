import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * CurrentTenant Decorator
 * 
 * Extracts the tenant ID from the authenticated request.
 * The tenant ID is set by the ApiKeyGuard after validating the API key.
 * 
 * @throws BadRequestException if tenant ID is not found in the request
 * 
 * @example
 * ```typescript
 * @Get()
 * @UseGuards(ApiKeyGuard)
 * async getResource(@CurrentTenant() tenantId: string) {
 *   return this.service.findByTenant(tenantId);
 * }
 * ```
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const tenantId = request.tenant?.id;

    if (!tenantId) {
      throw new BadRequestException('Missing tenantId in request. Ensure ApiKeyGuard is applied.');
    }

    return tenantId;
  },
);
