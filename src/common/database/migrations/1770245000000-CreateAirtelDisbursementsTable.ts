import { MigrationInterface, QueryRunner, Table, TableIndex, TableUnique } from 'typeorm';

export class CreateAirtelDisbursementsTable1770245000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'disbursements',
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
            length: '255',
            isNullable: false,
          },
          {
            name: 'externalId',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'payeeMsisdn',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'walletType',
            type: 'enum',
            enum: ['NORMAL', 'SALARY', 'MERCHANT', 'DISBURSEMENT'],
            default: "'NORMAL'",
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 19,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'ZMW'",
            isNullable: false,
          },
          {
            name: 'reference',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'encryptedPin',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'transactionType',
            type: 'enum',
            enum: [
              'B2C',
              'B2B',
              'G2C',
              'B2G',
              'SALARY',
              'LOAN',
              'DIVIDEND',
              'COMMISSION',
              'REFUND',
              'OTHER',
            ],
            default: "'B2C'",
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: [
              'PENDING',
              'PROCESSING',
              'SUCCESS',
              'FAILED',
              'TIMEOUT',
              'BOUNCED',
              'REFUNDED',
              'REFUND_PROCESSING',
              'REFUND_FAILED',
            ],
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'airtelReferenceId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'airtelMoneyId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'errorCode',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
        foreignKeys: [],
      }),
      true,
    );

    // Add indexes
    await queryRunner.createIndex(
      'disbursements',
      new TableIndex({
        name: 'idx_disbursement_tenant',
        columnNames: ['tenantId'],
      }),
    );

    // Unique index for idempotency
    await queryRunner.createIndex(
      'disbursements',
      new TableIndex({
        name: 'idx_disbursement_external',
        columnNames: ['tenantId', 'externalId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'disbursements',
      new TableIndex({
        name: 'idx_disbursement_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'disbursements',
      new TableIndex({
        name: 'idx_disbursement_created',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'disbursements',
      new TableIndex({
        name: 'idx_disbursement_payee',
        columnNames: ['payeeMsisdn'],
      }),
    );

    // Add check constraint for amount > 0
    await queryRunner.query(
      `ALTER TABLE "disbursements" ADD CONSTRAINT "chk_amount_positive" CHECK ("amount" > 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('disbursements');
  }
}
