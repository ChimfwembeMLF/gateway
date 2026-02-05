import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddWebhookLogsTable1770241000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'transactionId',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'payload',
            type: 'jsonb',
          },
          {
            name: 'signature',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['PENDING', 'PROCESSED', 'FAILED', 'SKIPPED'],
            default: "'PENDING'",
          },
          {
            name: 'result',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'processedAt',
            type: 'timestamp',
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
      'webhook_logs',
      new TableIndex({
        name: 'IDX_webhook_logs_transactionId',
        columnNames: ['transactionId'],
      }),
    );

    await queryRunner.createIndex(
      'webhook_logs',
      new TableIndex({
        name: 'IDX_webhook_logs_status_createdAt',
        columnNames: ['status', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'webhook_logs',
      new TableIndex({
        name: 'IDX_webhook_logs_createdAt',
        columnNames: ['createdAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhook_logs', true);
  }
}
