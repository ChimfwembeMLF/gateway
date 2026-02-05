import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface HealthCheckResult {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  timestamp: Date;
  database: ComponentHealth;
  mtnCollection: ComponentHealth;
  mtnDisbursement: ComponentHealth;
  overall: OverallHealth;
}

export interface ComponentHealth {
  status: 'UP' | 'DOWN';
  responseTime: number; // ms
  message?: string;
  lastChecked: Date;
}

export interface OverallHealth {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  message: string;
  componentsDown: string[];
}

/**
 * Health Check Service
 * 
 * Monitors critical system components:
 * - Database connectivity
 * - MTN Collection API
 * - MTN Disbursement API
 */
@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private lastHealthCheck: HealthCheckResult | null = null;
  private readonly CACHE_TTL_MS = 10000; // Cache for 10 seconds

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Run all health checks
   * Cached for 10 seconds to avoid overloading the system
   */
  async getHealthStatus(skipCache: boolean = false): Promise<HealthCheckResult> {
    // Return cached result if available and not expired
    if (!skipCache && this.lastHealthCheck) {
      const age = Date.now() - this.lastHealthCheck.timestamp.getTime();
      if (age < this.CACHE_TTL_MS) {
        return this.lastHealthCheck;
      }
    }

    const timestamp = new Date();
    const database = await this.checkDatabase();
    const mtnCollection = await this.checkMtnCollection();
    const mtnDisbursement = await this.checkMtnDisbursement();

    const componentsDown: string[] = [];
    if (database.status === 'DOWN') componentsDown.push('database');
    if (mtnCollection.status === 'DOWN') componentsDown.push('mtn-collection');
    if (mtnDisbursement.status === 'DOWN') componentsDown.push('mtn-disbursement');

    let overallStatus: 'UP' | 'DOWN' | 'DEGRADED' = 'UP';
    let overallMessage = 'All systems operational';

    if (componentsDown.length === 0) {
      overallStatus = 'UP';
      overallMessage = 'All systems operational';
    } else if (componentsDown.includes('database')) {
      // Database down = whole system down
      overallStatus = 'DOWN';
      overallMessage = 'Critical component down: database';
    } else if (componentsDown.length > 0) {
      overallStatus = 'DEGRADED';
      overallMessage = `Degraded: ${componentsDown.join(', ')} down`;
    }

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp,
      database,
      mtnCollection,
      mtnDisbursement,
      overall: {
        status: overallStatus,
        message: overallMessage,
        componentsDown,
      },
    };

    this.lastHealthCheck = result;
    return result;
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status: 'UP',
        responseTime,
        lastChecked: new Date(),
        message: 'Connected',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: 'DOWN',
        responseTime,
        lastChecked: new Date(),
        message:
          error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  /**
   * Check MTN Collection API connectivity
   */
  private async checkMtnCollection(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      const mtnBase = this.configService.get<string>('mtn.base');
      const mtnCollection = this.configService.get<any>('mtn.collection');

      // Try to get bearer token (simplest health check for the API)
      const username = mtnCollection.x_reference_id;
      const apiKey = mtnCollection.api_key;
      const authString = `${username}:${apiKey}`;
      const url = `${mtnBase}/collection/token/`;

      const response = await axios.post(
        url,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': mtnCollection.subscription_key,
            'X-Target-Environment': mtnCollection.target_environment,
            Authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
          },
          timeout: 5000,
        },
      );

      const responseTime = Date.now() - startTime;

      if (response.data?.access_token) {
        return {
          status: 'UP',
          responseTime,
          lastChecked: new Date(),
          message: 'API accessible',
        };
      }

      return {
        status: 'DOWN',
        responseTime,
        lastChecked: new Date(),
        message: 'Invalid response from API',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const axiosError = error as AxiosError;

      this.logger.warn('MTN Collection health check failed', {
        status: axiosError.response?.status,
        message: axiosError.message,
      });

      return {
        status: 'DOWN',
        responseTime,
        lastChecked: new Date(),
        message: `MTN Collection API unavailable: ${axiosError.message}`,
      };
    }
  }

  /**
   * Check MTN Disbursement API connectivity
   */
  private async checkMtnDisbursement(): Promise<ComponentHealth> {
    const startTime = Date.now();
    try {
      const mtnBase = this.configService.get<string>('mtn.base');
      const mtnDisbursement = this.configService.get<any>('mtn.disbursement');

      // Try to get bearer token (simplest health check for the API)
      const username = mtnDisbursement.x_reference_id;
      const apiKey = mtnDisbursement.api_key;
      const authString = `${username}:${apiKey}`;
      const url = `${mtnBase}/disbursement/token/`;

      const response = await axios.post(
        url,
        {},
        {
          headers: {
            'Ocp-Apim-Subscription-Key': mtnDisbursement.subscription_key,
            'X-Target-Environment': mtnDisbursement.target_environment,
            Authorization: `Basic ${Buffer.from(authString).toString('base64')}`,
          },
          timeout: 5000,
        },
      );

      const responseTime = Date.now() - startTime;

      if (response.data?.access_token) {
        return {
          status: 'UP',
          responseTime,
          lastChecked: new Date(),
          message: 'API accessible',
        };
      }

      return {
        status: 'DOWN',
        responseTime,
        lastChecked: new Date(),
        message: 'Invalid response from API',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const axiosError = error as AxiosError;

      this.logger.warn('MTN Disbursement health check failed', {
        status: axiosError.response?.status,
        message: axiosError.message,
      });

      return {
        status: 'DOWN',
        responseTime,
        lastChecked: new Date(),
        message: `MTN Disbursement API unavailable: ${axiosError.message}`,
      };
    }
  }
}
