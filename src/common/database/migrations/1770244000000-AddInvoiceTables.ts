import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddInvoiceTables1770244000000 implements MigrationInterface {
  name = 'AddInvoiceTables1770244000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create invoices table
    await queryRunner.createTable(
      new Table({
        name: 'invoices',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'invoiceNumber',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'tenantId',
            type: 'uuid',
          },
          {
            name: 'subscriptionId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'billingPeriodStart',
            type: 'date',
          },
          {
            name: 'billingPeriodEnd',
            type: 'date',
          },
          {
            name: 'issueDate',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'dueDate',
            type: 'date',
          },
          {
            name: 'subtotal',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'taxAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'taxRate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 0,
          },
          {
            name: 'discountAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'totalAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'amountPaid',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'USD'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['DRAFT', 'PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'],
            default: "'DRAFT'",
          },
          {
            name: 'paidAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'paymentMethod',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'paymentTransactionId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'pdfUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'emailSent',
            type: 'boolean',
            default: false,
          },
          {
            name: 'emailSentAt',
            type: 'timestamp',
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

    // Create indexes for invoices
    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_tenantId_status',
        columnNames: ['tenantId', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_tenantId_dueDate',
        columnNames: ['tenantId', 'dueDate'],
      }),
    );

    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_invoiceNumber',
        columnNames: ['invoiceNumber'],
      }),
    );

    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoices_billingPeriod',
        columnNames: ['billingPeriodStart', 'billingPeriodEnd'],
      }),
    );

    // Add foreign key to tenants
    await queryRunner.createForeignKey(
      'invoices',
      new TableForeignKey({
        columnNames: ['tenantId'],
        referencedTableName: 'tenants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create invoice_line_items table
    await queryRunner.createTable(
      new Table({
        name: 'invoice_line_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'invoiceId',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'enum',
            enum: ['SUBSCRIPTION', 'USAGE', 'OVERAGE', 'ADDON', 'DISCOUNT', 'CREDIT'],
            default: "'SUBSCRIPTION'",
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 1,
          },
          {
            name: 'unitPrice',
            type: 'decimal',
            precision: 10,
            scale: 2,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 10,
            scale: 2,
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
        ],
      }),
      true,
    );

    // Add foreign key to invoices
    await queryRunner.createForeignKey(
      'invoice_line_items',
      new TableForeignKey({
        columnNames: ['invoiceId'],
        referencedTableName: 'invoices',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const invoiceLineItemsTable = await queryRunner.getTable('invoice_line_items');
    const invoiceLineItemsFk = invoiceLineItemsTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('invoiceId') !== -1,
    );
    if (invoiceLineItemsFk) {
      await queryRunner.dropForeignKey('invoice_line_items', invoiceLineItemsFk);
    }

    const invoicesTable = await queryRunner.getTable('invoices');
    const invoicesTenantFk = invoicesTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('tenantId') !== -1,
    );
    if (invoicesTenantFk) {
      await queryRunner.dropForeignKey('invoices', invoicesTenantFk);
    }

    // Drop indexes
    await queryRunner.dropIndex('invoices', 'IDX_invoices_tenantId_status');
    await queryRunner.dropIndex('invoices', 'IDX_invoices_tenantId_dueDate');
    await queryRunner.dropIndex('invoices', 'IDX_invoices_invoiceNumber');
    await queryRunner.dropIndex('invoices', 'IDX_invoices_billingPeriod');

    // Drop tables
    await queryRunner.dropTable('invoice_line_items');
    await queryRunner.dropTable('invoices');
  }
}
