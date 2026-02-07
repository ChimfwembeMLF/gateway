import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { StructuredLoggingService } from './structured-logging.service';

/**
 * HTTP Request/Response Logging Interceptor
 * 
 * Automatically logs all HTTP requests and responses with:
 * - Unique request ID for tracing
 * - Timing information
 * - Tenant and user context
 * - Error details
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  constructor(private readonly loggingService: StructuredLoggingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Generate request ID if not present
    const requestId = request.headers['x-request-id'] || randomUUID();
    request.requestId = requestId;

    // Extract context from request
    const method = request.method;
    const path = request.path;
    const tenantId = request.headers['x-tenant-id'];
    const userId = request.user?.id;
    
    // Extract bearer token from Authorization header
    const authHeader = request.headers['authorization'] || '';
    const bearerToken = authHeader.replace('Bearer ', '').trim() || undefined;

    const startTime = Date.now();

    // Log request
    this.loggingService.logRequest(requestId, method, path, {
      tenantId,
      userId,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;
        const statusCode = response.statusCode;

        // Log response
        this.loggingService.logResponse(
          requestId,
          method,
          path,
          statusCode,
          duration,
          {
            tenantId,
            userId,
            bearerToken,
          },
        );

        // Add request ID to response headers
        response.setHeader('x-request-id', requestId);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;

        // Log error response
        this.loggingService.logResponse(
          requestId,
          method,
          path,
          statusCode,
          duration,
          {
            tenantId,
            userId,
            bearerToken,
          },
        );

        this.loggingService.logError(error, {
          operation: `${method} ${path}`,
          transactionId: requestId,
          tenantId,
          userId,
        });

        throw error;
      }),
    );
  }
}
