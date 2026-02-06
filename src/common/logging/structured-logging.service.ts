import { Injectable, Logger } from '@nestjs/common';

export interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  operation?: string;
  duration?: number;
  [key: string]: any;
}

export interface RequestLog {
  requestId: string;
  timestamp: Date;
  method: string;
  path: string;
  statusCode: number;
  duration: number; // ms
  tenantId?: string;
  userId?: string;
  error?: string;
}

export interface AuditLog {
  timestamp: Date;
  tenantId: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, any>;
  result: 'SUCCESS' | 'FAILURE';
  error?: string;
  ipAddress?: string;
}

/**
 * Structured Logging Service
 * 
 * Provides consistent, structured logging across the application:
 * - Request/response logging with context
 * - Audit trail enrichment
 * - Error context preservation
 * - Performance metrics
 */
@Injectable()
export class StructuredLoggingService {
  private readonly logger = new Logger(StructuredLoggingService.name);

  /**
   * Log HTTP request
   */
  logRequest(
    requestId: string,
    method: string,
    path: string,
    context?: LogContext,
  ): void {
    this.logger.log(
      JSON.stringify({
        type: 'HTTP_REQUEST',
        requestId,
        method,
        path,
        timestamp: new Date().toISOString(),
        ...context,
      }),
    );
  }

  /**
   * Log HTTP response with timing
   */
  logResponse(
    requestId: string,
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
  ): void {
    const logData = JSON.stringify({
      type: 'HTTP_RESPONSE',
      requestId,
      method,
      path,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
      ...context,
    });

    if (statusCode >= 400) {
      this.logger.warn(logData);
    } else {
      this.logger.log(logData);
    }
  }

  /**
   * Log payment/disbursement operation
   */
  logPaymentOperation(
    operationType: 'COLLECTION' | 'DISBURSEMENT',
    action: 'INITIATE' | 'PROCESS' | 'COMPLETE' | 'FAIL' | 'RETRY',
    transactionId: string,
    details: {
      tenantId: string;
      amount: number;
      currency: string;
      provider?: string;
      payer?: string;
      payee?: string;
      status?: string;
      error?: string;
      duration?: number;
    },
  ): void {
    const logData = JSON.stringify({
      type: 'PAYMENT_OPERATION',
      operationType,
      action,
      transactionId,
      timestamp: new Date().toISOString(),
      ...details,
    });

    if (action === 'FAIL') {
      this.logger.error(logData);
    } else {
      this.logger.log(logData);
    }
  }

  /**
   * Log MTN API call with request/response
   */
  logMtnApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    details?: {
      transactionId?: string;
      tenantId?: string;
      requestBody?: any;
      responseBody?: any;
      error?: string;
    },
  ): void {
    const logData = JSON.stringify({
      type: 'MTN_API_CALL',
      endpoint,
      method,
      statusCode,
      duration,
      timestamp: new Date().toISOString(),
      ...details,
    });

    if (statusCode >= 400) {
      this.logger.warn(logData);
    } else {
      this.logger.debug(logData);
    }
  }

  /**
   * Log webhook processing
   */
  logWebhookProcessing(
    transactionId: string,
    status: 'RECEIVED' | 'VALIDATED' | 'DUPLICATE' | 'PROCESSED' | 'FAILED',
    details?: {
      tenantId?: string;
      payload?: any;
      signature?: string;
      result?: any;
      error?: string;
    },
  ): void {
    const logData = JSON.stringify({
      type: 'WEBHOOK_PROCESSING',
      transactionId,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    });

    if (status === 'FAILED') {
      this.logger.error(logData);
    } else {
      this.logger.log(logData);
    }
  }

  /**
   * Log audit trail event
   */
  logAudit(
    tenantId: string,
    action: string,
    resource: string,
    resourceId: string,
    details?: {
      userId?: string;
      changes?: Record<string, any>;
      result: 'SUCCESS' | 'FAILURE';
      error?: string;
      ipAddress?: string;
    },
  ): void {
    this.logger.log(
      JSON.stringify({
        type: 'AUDIT_TRAIL',
        tenantId,
        action,
        resource,
        resourceId,
        timestamp: new Date().toISOString(),
        ...details,
      }),
    );
  }

  /**
   * Log error with full context
   */
  logError(
    error: Error | string,
    context: {
      operation?: string;
      transactionId?: string;
      tenantId?: string;
      userId?: string;
      details?: any;
    },
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      JSON.stringify({
        type: 'ERROR',
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        ...context,
      }),
    );
  }

  /**
   * Log performance metric
   */
  logPerformance(
    operation: string,
    duration: number,
    context?: LogContext,
  ): void {
    const logData = JSON.stringify({
      type: 'PERFORMANCE_METRIC',
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...context,
    });

    if (duration > 1000) {
      this.logger.warn(logData);
    } else {
      this.logger.debug(logData);
    }
  }

  /**
   * Log health check result
   */
  logHealthCheck(
    component: string,
    status: 'UP' | 'DOWN' | 'DEGRADED',
    duration: number,
    message?: string,
  ): void {
    this.logger.log(
      JSON.stringify({
        type: 'HEALTH_CHECK',
        component,
        status,
        duration,
        message,
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
