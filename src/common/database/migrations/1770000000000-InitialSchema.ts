import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class InitialSchema1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create tenants table
    const tenantsTableExists = await queryRunner.hasTable('tenants');
    if (!tenantsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'tenants',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'name',
              type: 'varchar',
              length: '255',
              isNullable: false,
              isUnique: true,
            },
            {
              name: 'slug',
              type: 'varchar',
              length: '255',
              isNullable: false,
              isUnique: true,
            },
            {
              name: 'apiKey',
              type: 'varchar',
              length: '255',
              isNullable: false,
              isUnique: true,
            },
            {
              name: 'description',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'webhookUrl',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'webhookKey',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'isActive',
              type: 'boolean',
              default: true,
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
        true,
      );

      // Create indexes for tenants
      await queryRunner.createIndex(
        'tenants',
        new TableIndex({
          name: 'IDX_tenants_name',
          columnNames: ['name'],
        }),
      );

      await queryRunner.createIndex(
        'tenants',
        new TableIndex({
          name: 'IDX_tenants_slug',
          columnNames: ['slug'],
        }),
      );

      await queryRunner.createIndex(
        'tenants',
        new TableIndex({
          name: 'IDX_tenants_apiKey',
          columnNames: ['apiKey'],
        }),
      );
    }

    // Create users table
    const usersTableExists = await queryRunner.hasTable('users');
    if (!usersTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'users',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'tenantId',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'username',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'email',
              type: 'varchar',
              length: '255',
              isNullable: true,
              isUnique: true,
            },
            {
              name: 'phone',
              type: 'varchar',
              length: '50',
              isNullable: true,
            },
            {
              name: 'isActive',
              type: 'boolean',
              default: true,
            },
            {
              name: 'firstName',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'lastName',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'profileImage',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'password',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'role',
              type: 'enum',
              enum: ['ADMIN', 'USER', 'SUPER_ADMIN'],
              default: "'USER'",
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
        true,
      );

      // Create indexes for users
      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_users_tenantId',
          columnNames: ['tenantId'],
        }),
      );

      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_users_username',
          columnNames: ['username'],
        }),
      );

      await queryRunner.createIndex(
        'users',
        new TableIndex({
          name: 'IDX_users_email',
          columnNames: ['email'],
        }),
      );

      // Add foreign key to tenants
      await queryRunner.createForeignKey(
        'users',
        new TableForeignKey({
          columnNames: ['tenantId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'tenants',
          onDelete: 'CASCADE',
        }),
      );
    }

    // Create payments table
    const paymentsTableExists = await queryRunner.hasTable('payments');
    if (!paymentsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'payments',
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
              isNullable: false,
            },
            {
              name: 'externalId',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'amount',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'currency',
              type: 'varchar',
              length: '3',
              default: "'UGX'",
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['pending', 'successful', 'failed'],
              default: "'pending'",
            },
            {
              name: 'payerMessage',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'payeeNote',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'mtnReferenceId',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'financialTransactionId',
              type: 'varchar',
              length: '255',
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
        true,
      );

      // Create unique index on externalId and tenantId
      await queryRunner.createIndex(
        'payments',
        new TableIndex({
          name: 'IDX_payments_externalId_tenantId',
          columnNames: ['externalId', 'tenantId'],
          isUnique: true,
        }),
      );

      // Add foreign key to tenants
      await queryRunner.createForeignKey(
        'payments',
        new TableForeignKey({
          columnNames: ['tenantId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'tenants',
          onDelete: 'CASCADE',
        }),
      );
    }

    // Create transactions table
    const transactionsTableExists = await queryRunner.hasTable('transactions');
    if (!transactionsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'transactions',
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
              isNullable: false,
            },
            {
              name: 'paymentId',
              type: 'uuid',
              isNullable: false,
            },
            {
              name: 'amount',
              type: 'decimal',
              precision: 10,
              scale: 2,
              isNullable: false,
            },
            {
              name: 'currency',
              type: 'varchar',
              length: '3',
              default: "'UGX'",
            },
            {
              name: 'status',
              type: 'enum',
              enum: ['pending', 'successful', 'failed'],
              default: "'pending'",
            },
            {
              name: 'type',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'provider',
              type: 'varchar',
              length: '50',
              default: "'MTN'",
            },
            {
              name: 'providerReference',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'metadata',
              type: 'jsonb',
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
        true,
      );

      // Add foreign key to payments
      await queryRunner.createForeignKey(
        'transactions',
        new TableForeignKey({
          columnNames: ['paymentId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'payments',
          onDelete: 'CASCADE',
        }),
      );

      // Add foreign key to tenants
      await queryRunner.createForeignKey(
        'transactions',
        new TableForeignKey({
          columnNames: ['tenantId'],
          referencedColumnNames: ['id'],
          referencedTableName: 'tenants',
          onDelete: 'CASCADE',
        }),
      );
    }

    // Create audits table
    const auditsTableExists = await queryRunner.hasTable('audits');
    if (!auditsTableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'audits',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              isPrimary: true,
              default: 'gen_random_uuid()',
            },
            {
              name: 'userId',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'event',
              type: 'varchar',
              length: '50',
              isNullable: false,
            },
            {
              name: 'auditableType',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'auditableId',
              type: 'varchar',
              length: '255',
              isNullable: false,
            },
            {
              name: 'oldValues',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'newValues',
              type: 'jsonb',
              isNullable: true,
            },
            {
              name: 'url',
              type: 'varchar',
              length: '500',
              isNullable: true,
            },
            {
              name: 'ipAddress',
              type: 'varchar',
              length: '45',
              isNullable: true,
            },
            {
              name: 'userAgent',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'tags',
              type: 'varchar',
              length: '255',
              isNullable: true,
            },
            {
              name: 'createdAt',
              type: 'timestamp',
              default: 'now()',
            },
          ],
        }),
        true,
      );

      // Create indexes
      await queryRunner.createIndex(
        'audits',
        new TableIndex({
          name: 'IDX_audits_auditableType_auditableId',
          columnNames: ['auditableType', 'auditableId'],
        }),
      );

      await queryRunner.createIndex(
        'audits',
        new TableIndex({
          name: 'IDX_audits_userId',
          columnNames: ['userId'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order
    await queryRunner.dropTable('audits', true);
    await queryRunner.dropTable('transactions', true);
    await queryRunner.dropTable('payments', true);
    await queryRunner.dropTable('users', true);
    await queryRunner.dropTable('tenants', true);
  }
}
