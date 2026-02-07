import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * MTN Webhook Signature Validation Service
 * 
 * Validates that incoming webhooks from MTN are legitimate by verifying
 * cryptographic signatures. MTN includes a signature header that must be
 * validated against the request body using a shared secret.
 */
@Injectable()
export class WebhookValidatorService {
  private readonly logger = new Logger(WebhookValidatorService.name);
  private readonly webhookSecret = this.configService.get<string>(
    'mtn.collection.webhook_secret',
  );

  constructor(private readonly configService: ConfigService) {
    if (!this.webhookSecret) {
      this.logger.warn(
        'MTN_COLLECTION_WEBHOOK_SECRET not configured. Webhook validation disabled.',
      );
    }
  }

  /**
   * Validate incoming webhook signature
   * 
   * MTN sends a signature in the X-Signature-256 header.
   * This is computed as: HMAC-SHA256(body, secret)
   * 
   * @param signature The signature from X-Signature-256 header
   * @param body The raw request body as string
   * @returns true if signature is valid, false otherwise
   * @throws BadRequestException if webhook secret is not configured
   */
  validateSignature(signature: string, body: string): boolean {
    if (!this.webhookSecret) {
      this.logger.error(
        'Webhook signature validation requested but MTN_COLLECTION_WEBHOOK_SECRET not configured',
      );
      throw new BadRequestException(
        'Webhook signature validation not configured on server',
      );
    }

    if (!signature) {
      this.logger.warn('Missing X-Signature-256 header in webhook request');
      return false;
    }

    try {
      // Compute expected signature: HMAC-SHA256(body, secret)
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(body)
        .digest('base64');

      // Compare signatures (constant-time comparison to prevent timing attacks)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );

      if (!isValid) {
        this.logger.warn(
          'Invalid webhook signature. Possible tampering or wrong secret.',
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error('Webhook signature validation error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Extract transaction ID from webhook payload
   * Used for duplicate detection
   * 
   * @param payload The webhook payload
   * @returns Transaction ID or null if not found
   */
  extractTransactionId(payload: any): string | null {
    return (
      payload?.referenceId ||
      payload?.transactionId ||
      payload?.externalId ||
      null
    );
  }

  /**
   * Validate webhook payload structure
   * Ensures required fields are present
   * 
   * @param payload The webhook payload
   * @returns true if payload is valid, false otherwise
   */
  validatePayloadStructure(payload: any): boolean {
    // Required fields for collection webhooks
    const requiredFields = ['referenceId', 'status'];

    for (const field of requiredFields) {
      if (!payload?.[field]) {
        this.logger.warn(
          `Missing required field in webhook payload: ${field}`,
        );
        return false;
      }
    }

    // Validate status is one of expected values
    const validStatuses = [
      'SUCCESSFUL',
      'FAILED',
      'PENDING',
      'REJECTED',
      'EXPIRED',
    ];
    if (!validStatuses.includes(payload.status)) {
      this.logger.warn(`Invalid webhook status: ${payload.status}`);
      return false;
    }

    return true;
  }
}
