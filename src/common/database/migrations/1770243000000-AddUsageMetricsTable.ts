import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddUsageMetricsTable1770243000000 implements MigrationInterface {
  name = 'AddUsageMetricsTable1770243000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'usage_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
          },
          {
            name: 'date',
            type: 'date',
          },
          {
            name: 'totalRequests',
            type: 'int',
            default: 0,
          },
          {
            name: 'successfulRequests',
            type: 'int',
            default: 0,
          },
          {
            name: 'failedRequests',
            type: 'int',
            default: 0,
          },
          {
            name: 'rateLimitedRequests',
            type: 'int',
            default: 0,
          },
          {
            name: 'avgResponseTime',
            type: 'float',
            default: 0,
          },
          {
            name: 'peakRequestsPerMinute',
            type: 'int',
            default: 0,
          },
          {
            name: 'dataTransferred',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'endpointBreakdown',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'statusCodeBreakdown',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
    );

    // Add indexes for fast queries
    await queryRunner.createIndex(
      'usage_metrics',
      new TableIndex({
        name: 'IDX_usage_metrics_tenantId_date',
        columnNames: ['tenantId', 'date'],
      }),
    );

    await queryRunner.createIndex(
      'usage_metrics',
      new TableIndex({
        name: 'IDX_usage_metrics_tenantId_createdAt',
        columnNames: ['tenantId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'usage_metrics',
      new TableIndex({
        name: 'IDX_usage_metrics_date',
        columnNames: ['date'],
      }),
    );

    // Add foreign key to tenants table
    await queryRunner.createForeignKey(
      'usage_metrics',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Add unique constraint on tenantId + date
    await queryRunner.createIndex(
      'usage_metrics',
      new TableIndex({
        name: 'IDX_usage_metrics_tenantId_date_unique',
        columnNames: ['tenantId', 'date'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('usage_metrics');
    if (table) {
      const fks = table.foreignKeys;
      for (const fk of fks) {
        await queryRunner.dropForeignKey('usage_metrics', fk);
      }
    }

    await queryRunner.dropTable('usage_metrics', true);
  }
}
