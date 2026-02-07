import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { UsageMetrics } from '../entities/usage-metrics.entity';

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  avgResponseTime: number;
  peakRequestsPerMinute: number;
  dataTransferred: number;
  topEndpoints: Array<{ endpoint: string; count: number }>;
  statusCodes: Record<string, number>;
}

export interface DailyUsage {
  date: string;
  requests: number;
  successful: number;
  failed: number;
  rateLimited: number;
}

/**
 * UsageMetricsService
 * Tracks and analyzes API usage per tenant
 */
@Injectable()
export class UsageMetricsService {
  private readonly logger = new Logger(UsageMetricsService.name);

  constructor(
    @InjectRepository(UsageMetrics)
    private readonly usageMetricsRepository: Repository<UsageMetrics>,
  ) {}

  /**
   * Record a single request
   */
  async recordRequest(
    tenantId: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    dataSize: number = 0,
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // Find or create today's metrics
      let metrics = await this.usageMetricsRepository.findOne({
        where: { tenantId, date: today },
      });

      if (!metrics) {
        metrics = this.usageMetricsRepository.create({
          tenantId,
          date: today,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          rateLimitedRequests: 0,
          avgResponseTime: 0,
          peakRequestsPerMinute: 0,
          dataTransferred: 0,
          endpointBreakdown: {},
          statusCodeBreakdown: {},
        });
      }

      // Update counters
      metrics.totalRequests++;
      
      if (statusCode >= 200 && statusCode < 300) {
        metrics.successfulRequests++;
      } else if (statusCode === 429) {
        metrics.rateLimitedRequests++;
      } else if (statusCode >= 400) {
        metrics.failedRequests++;
      }

      // Update average response time
      const totalTime = metrics.avgResponseTime * (metrics.totalRequests - 1);
      metrics.avgResponseTime = (totalTime + responseTime) / metrics.totalRequests;

      // Update data transferred
      metrics.dataTransferred = Number(metrics.dataTransferred) + dataSize;

      // Update endpoint breakdown
      const endpointBreakdown = metrics.endpointBreakdown || {};
      endpointBreakdown[endpoint] = (endpointBreakdown[endpoint] || 0) + 1;
      metrics.endpointBreakdown = endpointBreakdown;

      // Update status code breakdown
      const statusCodeBreakdown = metrics.statusCodeBreakdown || {};
      const statusKey = statusCode.toString();
      statusCodeBreakdown[statusKey] = (statusCodeBreakdown[statusKey] || 0) + 1;
      metrics.statusCodeBreakdown = statusCodeBreakdown;

      metrics.updatedAt = new Date();

      await this.usageMetricsRepository.save(metrics);
    } catch (error) {
      this.logger.error(
        `Failed to record usage for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get usage statistics for a tenant within a date range
   */
  async getTenantUsage(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<UsageStats> {
    const metrics = await this.usageMetricsRepository.find({
      where: {
        tenantId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitedRequests: 0,
        avgResponseTime: 0,
        peakRequestsPerMinute: 0,
        dataTransferred: 0,
        topEndpoints: [],
        statusCodes: {},
      };
    }

    // Aggregate metrics
    const aggregated = metrics.reduce(
      (acc, metric) => {
        acc.totalRequests += metric.totalRequests;
        acc.successfulRequests += metric.successfulRequests;
        acc.failedRequests += metric.failedRequests;
        acc.rateLimitedRequests += metric.rateLimitedRequests;
        acc.dataTransferred += Number(metric.dataTransferred);
        acc.peakRequestsPerMinute = Math.max(
          acc.peakRequestsPerMinute,
          metric.peakRequestsPerMinute,
        );

        // Merge endpoint breakdowns
        Object.entries(metric.endpointBreakdown || {}).forEach(
          ([endpoint, count]) => {
            acc.endpointBreakdown[endpoint] =
              (acc.endpointBreakdown[endpoint] || 0) + count;
          },
        );

        // Merge status code breakdowns
        Object.entries(metric.statusCodeBreakdown || {}).forEach(
          ([code, count]) => {
            acc.statusCodeBreakdown[code] =
              (acc.statusCodeBreakdown[code] || 0) + count;
          },
        );

        return acc;
      },
      {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitedRequests: 0,
        avgResponseTime: 0,
        peakRequestsPerMinute: 0,
        dataTransferred: 0,
        endpointBreakdown: {} as Record<string, number>,
        statusCodeBreakdown: {} as Record<string, number>,
      },
    );

    // Calculate average response time
    const totalResponseTime = metrics.reduce(
      (sum, m) => sum + m.avgResponseTime * m.totalRequests,
      0,
    );
    aggregated.avgResponseTime =
      aggregated.totalRequests > 0
        ? totalResponseTime / aggregated.totalRequests
        : 0;

    // Get top endpoints
    const topEndpoints = Object.entries(aggregated.endpointBreakdown)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests: aggregated.totalRequests,
      successfulRequests: aggregated.successfulRequests,
      failedRequests: aggregated.failedRequests,
      rateLimitedRequests: aggregated.rateLimitedRequests,
      avgResponseTime: Math.round(aggregated.avgResponseTime * 100) / 100,
      peakRequestsPerMinute: aggregated.peakRequestsPerMinute,
      dataTransferred: aggregated.dataTransferred,
      topEndpoints,
      statusCodes: aggregated.statusCodeBreakdown,
    };
  }

  /**
   * Get daily usage breakdown
   */
  async getDailyUsage(
    tenantId: string,
    startDate: string,
    endDate: string,
  ): Promise<DailyUsage[]> {
    const metrics = await this.usageMetricsRepository.find({
      where: {
        tenantId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    return metrics.map((m) => ({
      date: m.date,
      requests: m.totalRequests,
      successful: m.successfulRequests,
      failed: m.failedRequests,
      rateLimited: m.rateLimitedRequests,
    }));
  }

  /**
   * Get current month usage for a tenant
   */
  async getCurrentMonthUsage(tenantId: string): Promise<UsageStats> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    return this.getTenantUsage(tenantId, startDate, endDate);
  }

  /**
   * Get usage summary for all tenants (admin only)
   */
  async getAllTenantsUsage(
    startDate: string,
    endDate: string,
  ): Promise<Array<{ tenantId: string; usage: UsageStats }>> {
    const metrics = await this.usageMetricsRepository
      .createQueryBuilder('metrics')
      .where('metrics.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('metrics.tenantId')
      .getMany();

    const tenantIds = [...new Set(metrics.map((m) => m.tenantId))];

    const results = await Promise.all(
      tenantIds.map(async (tenantId) => ({
        tenantId,
        usage: await this.getTenantUsage(tenantId, startDate, endDate),
      })),
    );

    return results;
  }
}
