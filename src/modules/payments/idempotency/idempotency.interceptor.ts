import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';

/**
 * Idempotency interceptor for payment endpoints.
 * 
 * Intercepts requests with Idempotency-Key header and:
 * 1. Checks if this key+tenant has been processed before
 * 2. If yes, returns cached response immediately
 * 3. If no, processes request and caches response
 * 
 * Apply with: @UseInterceptors(IdempotencyInterceptor)
 * 
 * Client usage:
 * curl -X POST http://localhost:3000/api/v1/payments \
 *   -H "Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000" \
 *   -H "x-api-key: tenant_..." \
 *   -H "x-tenant-id: test-tenant" \
 *   -d '{"amount": 1000, ...}'
 * 
 * On retry with same key: returns 200 with same response (idempotent)
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly idempotencyService: IdempotencyService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const idempotencyKey = request.headers['idempotency-key'] as string;
    const tenantId = request.tenant?.id || request.tenant?.tenantId;

    // Idempotency-Key is optional but recommended
    if (!idempotencyKey) {
      this.logger.warn(
        `Request to ${request.method} ${request.path} missing Idempotency-Key`,
      );
      return next.handle();
    }

    if (!tenantId) {
      throw new BadRequestException('Tenant not found in request context');
    }

    // Validate key is a valid UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      throw new BadRequestException(
        'Idempotency-Key must be a valid UUID (RFC 4122)',
      );
    }

    // Check if this key was already processed
    const cached = await this.idempotencyService.checkIdempotencyKey(
      tenantId,
      idempotencyKey,
      request.method,
      request.path,
    );

    if (cached) {
      // Return cached response
      response.status(cached.statusCode);
      return new Observable((subscriber) => {
        subscriber.next(cached.responseBody);
        subscriber.complete();
      });
    }

    // Key not found or expired - process request normally and cache result
    return next.handle().pipe(
      map(async (responseBody) => {
        const statusCode = response.statusCode || 200;
        await this.idempotencyService.saveIdempotencyKey(
          tenantId,
          idempotencyKey,
          request.method,
          request.path,
          statusCode,
          responseBody,
        );
        return responseBody;
      }),
    );
  }
}
