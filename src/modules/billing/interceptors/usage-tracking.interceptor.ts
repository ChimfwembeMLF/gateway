import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { UsageMetricsService } from '../services';

/**
 * UsageTrackingInterceptor
 * Automatically tracks API usage for billing and analytics
 */
@Injectable()
export class UsageTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(UsageTrackingInterceptor.name);

  constructor(private readonly usageMetricsService: UsageMetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const tenantId = request.headers['x-tenant-id'] as string;

    // Skip tracking if no tenant ID
    if (!tenantId) {
      return next.handle();
    }

    const startTime = Date.now();
    const endpoint = this.normalizeEndpoint(request.path);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          const dataSize = this.estimateDataSize(data);

          // Record usage asynchronously (don't block response)
          setImmediate(() => {
            this.usageMetricsService
              .recordRequest(
                tenantId,
                endpoint,
                response.statusCode,
                responseTime,
                dataSize,
              )
              .catch((error) => {
                this.logger.error(
                  `Failed to record usage: ${error.message}`,
                  error.stack,
                );
              });
          });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;

          // Record error usage
          setImmediate(() => {
            this.usageMetricsService
              .recordRequest(tenantId, endpoint, statusCode, responseTime, 0)
              .catch((err) => {
                this.logger.error(
                  `Failed to record error usage: ${err.message}`,
                  err.stack,
                );
              });
          });
        },
      }),
    );
  }

  /**
   * Normalize endpoint path for consistent grouping
   * Replaces UUIDs and IDs with placeholders
   */
  private normalizeEndpoint(path: string): string {
    return path
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      .replace(/\/\d+/g, '/:id');
  }

  /**
   * Estimate response data size in bytes
   */
  private estimateDataSize(data: any): number {
    if (!data) return 0;
    
    try {
      const jsonStr = JSON.stringify(data);
      return Buffer.byteLength(jsonStr, 'utf8');
    } catch {
      return 0;
    }
  }
}
