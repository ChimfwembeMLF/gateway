import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddIdempotencyKeysTable1770239000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('idempotency_keys');
    if (tableExists) {
      return; // Skip if table already exists
    }

    await queryRunner.createTable(
      new Table({
        name: 'idempotency_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenantId',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'idempotencyKey',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'method',
            type: 'varchar',
            isNullable: false,
            comment: 'HTTP method (POST, GET, etc.)',
          },
          {
            name: 'path',
            type: 'varchar',
            isNullable: false,
            comment: 'Request path (e.g., /api/v1/payments)',
          },
          {
            name: 'statusCode',
            type: 'int',
            isNullable: false,
            comment: 'HTTP status code of cached response',
          },
          {
            name: 'responseBody',
            type: 'text',
            isNullable: false,
            comment: 'Serialized JSON response body',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'expiresAt',
            type: 'timestamp',
            isNullable: false,
            comment: 'TTL for idempotency record (default 24 hours)',
          },
        ],
      }),
      true,
    );

    // Unique index on (tenantId, idempotencyKey) - one key per tenant
    await queryRunner.createIndex(
      'idempotency_keys',
      new TableIndex({
        name: 'IDX_idempotency_keys_tenant_key',
        columnNames: ['tenantId', 'idempotencyKey'],
        isUnique: true,
      }),
    );

    // Index on expiresAt for cleanup queries
    await queryRunner.createIndex(
      'idempotency_keys',
      new TableIndex({
        name: 'IDX_idempotency_keys_expires_at',
        columnNames: ['expiresAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('idempotency_keys');
  }
}
