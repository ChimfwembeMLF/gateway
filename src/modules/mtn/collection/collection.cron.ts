import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CollectionService } from './collection.service';
import { RoleType } from 'src/common/enums/role-type.enum';

@Injectable()
export class CollectionCronJobs {
  private readonly logger = new Logger(CollectionCronJobs.name);

  // SYSTEM SUPER ADMIN USER for cron jobs
  private readonly systemSuperAdmin = { id: 'system', roles: [RoleType.SUPER_ADMIN], tenantId: 'system' };
  private readonly tenantId = 'system'; // Or loop through all tenants if needed

  constructor(private readonly collectionService: CollectionService) {}

  // Poll pending collection requests every 2 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async pollPendingCollections() {
    this.logger.debug('Polling pending collection requests...');
    await this.collectionService.pollPendingCollections(this.tenantId, this.systemSuperAdmin);
  }

  // Reconcile payments every day at 2am
  @Cron('0 2 * * *')
  async reconcileCollections() {
    this.logger.debug('Reconciling collection records...');
    await this.collectionService.reconcileCollections(this.tenantId, this.systemSuperAdmin);
  }

  // Clean up old records every Sunday at 3am
  @Cron('0 3 * * 0')
  async cleanupOldCollections() {
    this.logger.debug('Cleaning up old collection records...');
    await this.collectionService.cleanupOldCollections(this.tenantId, this.systemSuperAdmin);
  }
}
