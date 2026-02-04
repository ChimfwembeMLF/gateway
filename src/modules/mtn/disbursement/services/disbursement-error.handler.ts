import { Injectable, Logger } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';

export interface DisbursementError {
  code: string;
  message: string;
  httpStatus: number;
  isRetryable: boolean;
  retryAfterSeconds?: number;
}

@Injectable()
export class DisbursementErrorHandler {
  private readonly logger = new Logger(DisbursementErrorHandler.name);

  /**
   * Map MTN API error response to standard error
   */
  mapMtnError(mtnResponse: any): DisbursementError {
    this.logger.warn(`Mapping MTN error: ${JSON.stringify(mtnResponse)}`);

    const errorCode = mtnResponse?.code || mtnResponse?.error || 'UNKNOWN_ERROR';
    const errorMessage = mtnResponse?.message || 'Unknown error occurred';

    // MTN error codes mapping
    const errorMap: Record<string, DisbursementError> = {
      PAYEE_NOT_FOUND: {
        code: 'PAYEE_NOT_FOUND',
        message: 'Payee account not found or inactive',
        httpStatus: HttpStatus.BAD_REQUEST,
        isRetryable: false,
      },
      INSUFFICIENT_BALANCE: {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance in disbursement account',
        httpStatus: HttpStatus.BAD_REQUEST,
        isRetryable: false,
      },
      TRANSACTION_TIMED_OUT: {
        code: 'TRANSACTION_TIMED_OUT',
        message: 'Transaction processing timeout',
        httpStatus: HttpStatus.GATEWAY_TIMEOUT,
        isRetryable: true,
        retryAfterSeconds: 30,
      },
      INVALID_CURRENCY: {
        code: 'INVALID_CURRENCY',
        message: 'Invalid or unsupported currency',
        httpStatus: HttpStatus.BAD_REQUEST,
        isRetryable: false,
      },
      DUPLICATE_REFERENCE_ID: {
        code: 'DUPLICATE_REFERENCE_ID',
        message: 'Duplicate reference ID already processed',
        httpStatus: HttpStatus.CONFLICT,
        isRetryable: false,
      },
      NOT_ALLOWED_TARGET_ENVIRONMENT: {
        code: 'NOT_ALLOWED_TARGET_ENVIRONMENT',
        message: 'Access to target environment forbidden',
        httpStatus: HttpStatus.FORBIDDEN,
        isRetryable: false,
      },
      INTERNAL_SERVER_ERROR: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'MTN API internal error',
        httpStatus: HttpStatus.BAD_GATEWAY,
        isRetryable: true,
        retryAfterSeconds: 60,
      },
    };

    return (
      errorMap[errorCode] || {
        code: errorCode,
        message: errorMessage,
        httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
        isRetryable: true,
        retryAfterSeconds: 60,
      }
    );
  }

  /**
   * Classify error for retry decision
   */
  isRetryable(error: DisbursementError): boolean {
    // Retryable errors: timeouts, server errors, temporary issues
    const retryableStatuses = [
      HttpStatus.GATEWAY_TIMEOUT,
      HttpStatus.SERVICE_UNAVAILABLE,
      HttpStatus.BAD_GATEWAY,
    ];

    return error.isRetryable || retryableStatuses.includes(error.httpStatus);
  }

  /**
   * Calculate next retry time with exponential backoff
   */
  calculateNextRetry(retryCount: number): Date {
    // Exponential backoff: 30s, 1m, 2m, 5m, 10m
    const delays = [30, 60, 120, 300, 600];
    const delaySeconds = delays[Math.min(retryCount, delays.length - 1)];

    const nextRetry = new Date();
    nextRetry.setSeconds(nextRetry.getSeconds() + delaySeconds);

    this.logger.log(
      `Next retry scheduled in ${delaySeconds}s (attempt ${retryCount + 1})`,
    );

    return nextRetry;
  }

  /**
   * Get HTTP exception from disbursement error
   */
  toHttpException(error: DisbursementError): HttpException {
    return new HttpException(
      {
        statusCode: error.httpStatus,
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
      },
      error.httpStatus,
    );
  }
}
