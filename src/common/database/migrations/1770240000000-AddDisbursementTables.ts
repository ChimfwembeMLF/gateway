import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddDisbursementTables1770240000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('disbursements');
    if (tableExists) {
      return; // Skip if table already exists
    }

    // Create disbursements table
    await queryRunner.createTable(
      new Table({
        name: 'disbursements',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'tenantId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['TRANSFER', 'DEPOSIT', 'REFUND'],
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'EXPIRED'],
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'externalId',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'numeric',
            precision: 15,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            isNullable: false,
          },
          {
            name: 'payeeType',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'payeeId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'payerMessage',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'payeeNote',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'mtnTransactionId',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'mtnCallbackUrl',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'errorDetails',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'retryCount',
            type: 'int',
            default: 0,
            isNullable: false,
          },
          {
            name: 'nextRetryAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create disbursements indexes
    await queryRunner.createIndex(
      'disbursements',
      new TableIndex({
        name: 'IDX_disbursements_tenant_external',
        columnNames: ['tenantId', 'externalId'],
      }),
    );

    await queryRunner.createIndex(
      'disbursements',
      new TableIndex({
        name: 'IDX_disbursements_tenant_created',
        columnNames: ['tenantId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'disbursements',
      new TableIndex({
        name: 'IDX_disbursements_status_created',
        columnNames: ['status', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'disbursements',
      new TableIndex({
        name: 'IDX_disbursements_expires_at',
        columnNames: ['expiresAt'],
      }),
    );

    // Add foreign key to tenants
    await queryRunner.createForeignKey(
      'disbursements',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      }),
    );

    // Create disbursement_transactions table
    await queryRunner.createTable(
      new Table({
        name: 'disbursement_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'disbursementId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['INITIATED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'TIMEOUT'],
            isNullable: false,
          },
          {
            name: 'mtnTransactionId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'provider',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'httpStatusCode',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'requestPayload',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'responsePayload',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'errorDetails',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'durationMs',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create disbursement_transactions indexes
    await queryRunner.createIndex(
      'disbursement_transactions',
      new TableIndex({
        name: 'IDX_disbursement_trans_disbursement',
        columnNames: ['disbursementId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'disbursement_transactions',
      new TableIndex({
        name: 'IDX_disbursement_trans_mtn_id',
        columnNames: ['mtnTransactionId'],
      }),
    );

    // Add foreign key
    await queryRunner.createForeignKey(
      'disbursement_transactions',
      new TableForeignKey({
        columnNames: ['disbursementId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'disbursements',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('disbursement_transactions');
    await queryRunner.dropTable('disbursements');
  }
}
