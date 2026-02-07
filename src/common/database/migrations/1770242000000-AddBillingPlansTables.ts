import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddBillingPlansTables1770242000000 implements MigrationInterface {
  name = 'AddBillingPlansTables1770242000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('billing_plans');
    if (tableExists) {
      return; // Skip if tables already exist
    }

    // Create billing_plans table
    await queryRunner.createTable(
      new Table({
        name: 'billing_plans',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE'],
            isUnique: true,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'monthlyPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'yearlyPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'requestsPerMinute',
            type: 'int',
            default: 100,
          },
          {
            name: 'maxDailyRequests',
            type: 'int',
            default: 10000,
          },
          {
            name: 'maxConcurrentRequests',
            type: 'int',
            default: 10,
          },
          {
            name: 'features',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'supportTier',
            type: 'varchar',
            length: '50',
            default: "'email'",
          },
          {
            name: 'slaUptime',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 99.0,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'priority',
            type: 'int',
            default: 1,
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

    // Create tenant_billing_subscriptions table
    await queryRunner.createTable(
      new Table({
        name: 'tenant_billing_subscriptions',
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
            name: 'billingPlanId',
            type: 'uuid',
          },
          {
            name: 'startDate',
            type: 'timestamp',
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'billingFrequency',
            type: 'varchar',
            length: '50',
            default: "'MONTHLY'",
          },
          {
            name: 'autoRenew',
            type: 'boolean',
            default: true,
          },
          {
            name: 'amountPaid',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'cancellationReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cancelledAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
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

    // Add indexes
    await queryRunner.createIndex(
      'tenant_billing_subscriptions',
      new TableIndex({
        name: 'IDX_tenant_billing_subscriptions_tenantId_isActive',
        columnNames: ['tenantId', 'isActive'],
      }),
    );

    await queryRunner.createIndex(
      'tenant_billing_subscriptions',
      new TableIndex({
        name: 'IDX_tenant_billing_subscriptions_tenantId_expiresAt',
        columnNames: ['tenantId', 'expiresAt'],
      }),
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'tenant_billing_subscriptions',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'tenant_billing_subscriptions',
      new TableForeignKey({
        columnNames: ['billingPlanId'],
        referencedTableName: 'billing_plans',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('tenant_billing_subscriptions');
    if (table) {
      const fks = table.foreignKeys;
      for (const fk of fks) {
        await queryRunner.dropForeignKey('tenant_billing_subscriptions', fk);
      }
    }

    // Drop tables
    await queryRunner.dropTable('tenant_billing_subscriptions', true);
    await queryRunner.dropTable('billing_plans', true);
  }
}
