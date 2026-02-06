import { Injectable } from '@nestjs/common';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Disbursement } from '../entities/disbursement.entity';
import { DisbursementStatus } from 'src/common/enums/disbursement-status.enum';

/**
 * Custom repository for Disbursement entity
 * Provides specialized queries for common disbursement operations
 */
@Injectable()
export class DisbursementRepository extends Repository<Disbursement> {
  constructor(dataSource: DataSource) {
    super(Disbursement, dataSource.createEntityManager());
  }

  /**
   * Find disbursement by external ID with tenant isolation
   * @param tenantId Tenant ID
   * @param externalId Client-provided idempotency key
   * @returns Disbursement if found, null otherwise
   */
  async findByExternalId(
    tenantId: string,
    externalId: string,
  ): Promise<Disbursement | null> {
    return this.findOne({
      where: {
        tenantId,
        externalId,
      },
    });
  }

  /**
   * Find disbursement by ID with tenant isolation
   * @param id Disbursement UUID
   * @param tenantId Tenant ID (for security)
   * @returns Disbursement if found, null otherwise
   */
  async findByIdForTenant(
    id: string,
    tenantId: string,
  ): Promise<Disbursement | null> {
    return this.findOne({
      where: {
        id,
        tenantId,
      },
    });
  }

  /**
   * Find disbursement by Airtel reference ID with tenant isolation
   * @param tenantId Tenant ID
   * @param airtelReferenceId Airtel's reference ID
   * @returns Disbursement if found, null otherwise
   */
  async findByAirtelReference(
    tenantId: string,
    airtelReferenceId: string,
  ): Promise<Disbursement | null> {
    return this.findOne({
      where: {
        tenantId,
        airtelReferenceId,
      },
    });
  }

  /**
   * Find disbursement by Airtel Money ID with tenant isolation
   * @param tenantId Tenant ID
   * @param airtelMoneyId Airtel Money transaction ID
   * @returns Disbursement if found, null otherwise
   */
  async findByAirtelMoneyId(
    tenantId: string,
    airtelMoneyId: string,
  ): Promise<Disbursement | null> {
    return this.findOne({
      where: {
        tenantId,
        airtelMoneyId,
      },
    });
  }

  /**
   * List disbursements for a tenant with filtering and pagination
   * @param tenantId Tenant ID
   * @param status Filter by status (optional)
   * @param startDate Filter by creation date start (optional)
   * @param endDate Filter by creation date end (optional)
   * @param skip Number of records to skip (pagination)
   * @param take Number of records to retrieve (pagination)
   * @returns Array of disbursements and total count
   */
  async listByTenant(
    tenantId: string,
    options: {
      status?: DisbursementStatus;
      startDate?: Date;
      endDate?: Date;
      skip: number;
      take: number;
    },
  ): Promise<[Disbursement[], number]> {
    let query = this.createQueryBuilder('disbursement').where(
      'disbursement.tenantId = :tenantId',
      {
        tenantId,
      },
    );

    // Apply status filter if provided
    if (options.status) {
      query = query.andWhere('disbursement.status = :status', {
        status: options.status,
      });
    }

    // Apply date range filters if provided
    if (options.startDate) {
      query = query.andWhere('disbursement.createdAt >= :startDate', {
        startDate: options.startDate,
      });
    }

    if (options.endDate) {
      query = query.andWhere('disbursement.createdAt <= :endDate', {
        endDate: options.endDate,
      });
    }

    // Order by creation date (newest first)
    query = query.orderBy('disbursement.createdAt', 'DESC');

    // Apply pagination
    query = query.skip(options.skip).take(options.take);

    return query.getManyAndCount();
  }

  /**
   * Find all pending disbursements for a tenant
   * Useful for status polling operations
   * @param tenantId Tenant ID
   * @returns Array of pending disbursements
   */
  async findPendingByTenant(tenantId: string): Promise<Disbursement[]> {
    return this.find({
      where: {
        tenantId,
        status: DisbursementStatus.PENDING,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find all processing disbursements for a tenant
   * Useful for retry operations
   * @param tenantId Tenant ID
   * @returns Array of processing disbursements
   */
  async findProcessingByTenant(tenantId: string): Promise<Disbursement[]> {
    return this.find({
      where: {
        tenantId,
        status: DisbursementStatus.PROCESSING,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Count disbursements by status for a tenant
   * Useful for analytics and monitoring
   * @param tenantId Tenant ID
   * @param status Status to count
   * @returns Number of disbursements with the specified status
   */
  async countByStatus(
    tenantId: string,
    status: DisbursementStatus,
  ): Promise<number> {
    return this.count({
      where: {
        tenantId,
        status,
      },
    });
  }

  /**
   * Find disbursements by payee MSISDN for a tenant
   * Useful for recipient history lookups
   * @param tenantId Tenant ID
   * @param payeeMsisdn Recipient MSISDN
   * @param limit Max results
   * @returns Array of disbursements to this payee
   */
  async findByPayee(
    tenantId: string,
    payeeMsisdn: string,
    limit: number = 10,
  ): Promise<Disbursement[]> {
    return this.find({
      where: {
        tenantId,
        payeeMsisdn,
      },
      order: {
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  /**
   * Build a query for complex filtering
   * Returns QueryBuilder for custom chaining
   * @param tenantId Tenant ID
   * @returns QueryBuilder instance
   */
  buildTenantQuery(tenantId: string): SelectQueryBuilder<Disbursement> {
    return this.createQueryBuilder('disbursement').where(
      'disbursement.tenantId = :tenantId',
      {
        tenantId,
      },
    );
  }
}
