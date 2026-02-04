import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  url?: string;
  userAgent?: string;
}

export const auditContextStorage = new AsyncLocalStorage<AuditContext>();

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req['user'] as any;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const url = req.originalUrl;
    const userAgent = req.headers['user-agent'];

    const auditContext: AuditContext = {
      userId: (user && (user.id || user.userId || user.sub)) || undefined,
      ipAddress,
      url,
      userAgent,
    };

    auditContextStorage.run(auditContext, () => {
      next();
    });
  }
}

/**
 * Helper function to get current audit context
 * Use this in services to access audit context safely
 */
export function getAuditContext(): AuditContext | undefined {
  return auditContextStorage.getStore();
}
