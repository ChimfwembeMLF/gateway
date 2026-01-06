import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  constructor(private readonly dataSource: DataSource) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Patch the queryRunner for this request
    const user = req['user'] as any; // Set by your auth guard/interceptor
    const ipAddress = req.ip || req.connection.remoteAddress;
    const url = req.originalUrl;
    const userAgent = req.headers['user-agent'];

    // Listen for a new queryRunner on this request
    const origCreateQueryRunner = this.dataSource.createQueryRunner.bind(this.dataSource);
    this.dataSource.createQueryRunner = (...args) => {
      const queryRunner = origCreateQueryRunner(...args);
      queryRunner.data = queryRunner.data || {};
      // Try to get userId from multiple possible fields
      queryRunner.data.userId = (user && (user.id || user.userId || user.sub)) || null;
      queryRunner.data.ipAddress = ipAddress;
      queryRunner.data.url = url;
      queryRunner.data.userAgent = userAgent;
      // You can add tags or other context here
      return queryRunner;
    };
    next();
  }
}
