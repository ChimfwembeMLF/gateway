import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { HealthCheckService } from './health-check.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Application is healthy' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @ApiResponse({ status: 200, description: 'Application is ready for traffic' })
  ready() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('status')
  @ApiQuery({
    name: 'refresh',
    required: false,
    type: Boolean,
    description: 'Force refresh health check (skip 10s cache)',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed health status of all components',
  })
  @ApiResponse({
    status: 503,
    description: 'System degraded or down',
  })
  async getDetailedHealth(@Query('refresh') refresh?: string) {
    const skipCache = refresh === 'true';
    const health = await this.healthCheckService.getHealthStatus(skipCache);

    // Return 503 if system is down, 200 for UP or DEGRADED
    const statusCode =
      health.status === 'DOWN' ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.OK;

    if (statusCode === HttpStatus.SERVICE_UNAVAILABLE) {
      throw new HttpException(health, statusCode);
    }

    return health;
  }

  @Get('deep')
  @ApiResponse({
    status: 200,
    description: 'Full health status with all component details',
  })
  async getDeepHealth() {
    const health = await this.healthCheckService.getHealthStatus(true);
    return {
      ...health,
      checks: {
        database: health.database,
        apis: {
          collection: health.mtnCollection,
          disbursement: health.mtnDisbursement,
        },
      },
      responseTime: `${health.database.responseTime + health.mtnCollection.responseTime + health.mtnDisbursement.responseTime}ms`,
    };
  }
}
