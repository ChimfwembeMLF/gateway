import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { BillingLimitService } from '../../modules/billing/services';

interface RequestTracker {
  count: number;
  resetTime: number;
}

/**
 * TenantThrottlerGuard
 * Custom guard that applies per-tenant rate limits based on billing plan
 */
@Injectable()
export class TenantThrottlerGuard implements CanActivate {
  private readonly logger = new Logger(TenantThrottlerGuard.name);
  private readonly requestTrackers = new Map<string, RequestTracker>();

  constructor(private readonly billingLimitService: BillingLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = request.headers['x-tenant-id'] as string;

    // If no tenant ID, allow request (skip rate limiting)
    if (!tenantId) {
      return true;
    }

    try {
      // Get tenant's rate limit config
      const limits = await this.billingLimitService.getTenantRateLimits(
        tenantId,
      );

      // Generate unique key for tracking
      const key = this.generateKey(tenantId, request);
      const now = Date.now();

      // Get or create tracker
      let tracker = this.requestTrackers.get(key);
      if (!tracker || now > tracker.resetTime) {
        tracker = {
          count: 0,
          resetTime: now + 60 * 1000, // Reset every 60 seconds
        };
        this.requestTrackers.set(key, tracker);
      }

      // Increment counter
      tracker.count++;

      // Check if exceeded limit
      if (tracker.count > limits.requestsPerMinute) {
        this.logger.warn(
          `Tenant ${tenantId} exceeded rate limit of ${limits.requestsPerMinute} req/min (current: ${tracker.count})`,
        );
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Too many requests. Limit: ${limits.requestsPerMinute} per minute`,
            error: 'Too Many Requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Add rate limit info to response headers
      const response = context.switchToHttp().getResponse();
      response.setHeader(
        'X-RateLimit-Limit',
        limits.requestsPerMinute,
      );
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, limits.requestsPerMinute - tracker.count),
      );
      response.setHeader('X-RateLimit-Reset', tracker.resetTime);

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Log error but allow request (fail open)
      this.logger.error(
        `Error checking rate limits for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      return true;
    }
  }

  /**
   * Generate unique key for rate limiting per tenant + IP
   */
  private generateKey(tenantId: string, request: Request): string {
    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      request.ip ||
      'unknown';
    return `${tenantId}:${ip}`;
  }
}
