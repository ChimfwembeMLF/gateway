import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggingMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      const user = (req as any).user?.id || 'anonymous';

      this.logger.debug(
        `${method} ${originalUrl} - ${statusCode} - ${duration}ms - ${user} - ${ip}`,
      );
    });

    next();
  }
}
