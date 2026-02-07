import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IdempotencyKey } from './idempotency-key.entity';

/**
 * Idempotency service to handle deduplication of payment requests.
 *
 * Usage:
 * 1. Before processing request: checkAndStore() to see if key was already processed
 * 2. After successful response: saveIdempotencyKey() to cache the result
 * 3. On retry with same key: checkAndStore() returns cached response
 *
 * Benefits:
 * - Prevents duplicate payments if client retries due to network timeout
 * - Safe for payment processors that auto-retry requests
 * - Transparent to client (they just need to send Idempotency-Key header)
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @InjectRepository(IdempotencyKey)
    private idempotencyKeyRepository: Repository<IdempotencyKey>,
  ) {}

  /**
   * Check if an idempotency key has been processed before.
   * Returns cached response if found, or null if not found.
   *
   * @throws BadRequestException if key found but for different HTTP method/path
   */
  async checkIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    method: string,
    path: string,
  ): Promise<{ statusCode: number; responseBody: any } | null> {
    const record = await this.idempotencyKeyRepository.findOne({
      where: { tenantId, idempotencyKey },
    });

    if (!record) {
      return null; // Key not found, process new request
    }

    // Key found - verify it's for the same endpoint
    if (record.method !== method || record.path !== path) {
      this.logger.warn(
        `Idempotency key mismatch for tenant ${tenantId}: ` +
        `previous=${record.method} ${record.path}, current=${method} ${path}`,
      );
      throw new BadRequestException(
        'Idempotency-Key was used for a different request. Use a new key.',
      );
    }

    // Check if expired (24 hours default)
    if (new Date() > record.expiresAt) {
      this.logger.log(
        `Idempotency key ${idempotencyKey} for tenant ${tenantId} expired`,
      );
      return null; // Expired, treat as new request
    }

    this.logger.log(
      `Returning cached response for idempotency key ${idempotencyKey}`,
    );
    return {
      statusCode: record.statusCode,
      responseBody: JSON.parse(record.responseBody),
    };
  }

  /**
   * Store idempotency key + response for future retries.
   * Automatically expires after 24 hours.
   */
  async saveIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    method: string,
    path: string,
    statusCode: number,
    responseBody: any,
    ttlHours: number = 24,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + ttlHours);

    try {
      await this.idempotencyKeyRepository.upsert(
        {
          tenantId,
          idempotencyKey,
          method,
          path,
          statusCode,
          responseBody: JSON.stringify(responseBody),
          expiresAt,
        },
        ['tenantId', 'idempotencyKey'],
      );
      this.logger.log(
        `Stored idempotency key ${idempotencyKey} for tenant ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store idempotency key: ${error.message}`,
        error.stack,
      );
      // Don't throw - let the response go through even if caching fails
      // On retry without cache, client may get duplicate but at least succeeds
    }
  }

  /**
   * Cleanup expired idempotency keys (run via cron job).
   * Keep database clean to avoid unbounded growth.
   */
  async cleanupExpiredKeys(): Promise<number> {
    const result = await this.idempotencyKeyRepository.delete({
      expiresAt: new Date(),
    });
    this.logger.log(
      `[CRON] Cleaned up ${result.affected ?? 0} expired idempotency keys`,
    );
    return result.affected ?? 0;
  }
}
