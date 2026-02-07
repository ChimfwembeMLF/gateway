import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMerchantConfigurationsTable1770300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'merchant_configurations',
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
            isUnique: true,
          },
          // Business Information
          {
            name: 'businessName',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'businessRegistrationNumber',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'taxId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'businessCategory',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'websiteUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'businessAddress',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'contactPersonName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'contactPersonPhone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'contactPersonEmail',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          // MTN Credentials
          {
            name: 'mtnCollectionSubscriptionKey',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'mtnCollectionApiKey',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'mtnCollectionXReferenceId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'mtnCollectionTargetEnvironment',
            type: 'varchar',
            length: '50',
            default: "'sandbox'",
            isNullable: false,
          },
          {
            name: 'mtnDisbursementSubscriptionKey',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'mtnDisbursementApiKey',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'mtnDisbursementXReferenceId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'mtnDisbursementTargetEnvironment',
            type: 'varchar',
            length: '50',
            default: "'sandbox'",
            isNullable: false,
          },
          {
            name: 'mtnAccountHolder',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'mtnAccountActive',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'mtnLastVerified',
            type: 'timestamp',
            isNullable: true,
          },
          // Airtel Credentials
          {
            name: 'airtelClientId',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'airtelClientSecret',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'airtelSigningSecret',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'airtelEncryptionPublicKey',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'airtelEnvironment',
            type: 'varchar',
            length: '50',
            default: "'staging'",
            isNullable: false,
          },
          {
            name: 'airtelCountry',
            type: 'varchar',
            length: '2',
            default: "'ZM'",
            isNullable: false,
          },
          {
            name: 'airtelCurrency',
            type: 'varchar',
            length: '3',
            default: "'ZMW'",
            isNullable: false,
          },
          {
            name: 'airtelMerchantId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'airtelAccountActive',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'airtelLastVerified',
            type: 'timestamp',
            isNullable: true,
          },
          // Bank Account Information
          {
            name: 'bankAccountHolder',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'bankAccountNumber',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'bankAccountType',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'bankName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'bankBranchCode',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'bankSwiftCode',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'bankAccountCurrency',
            type: 'varchar',
            length: '3',
            default: "'ZMW'",
            isNullable: false,
          },
          {
            name: 'bankAccountVerified',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'bankAccountVerifiedDate',
            type: 'timestamp',
            isNullable: true,
          },
          // KYC & Compliance
          {
            name: 'kycStatus',
            type: 'enum',
            enum: ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_UPDATE'],
            default: "'PENDING'",
            isNullable: false,
          },
          {
            name: 'kycSubmittedDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'kycVerifiedDate',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'kycRejectionReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'directorName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'directorIdNumber',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'directorIdType',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'beneficialOwnerInfo',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'complianceNotes',
            type: 'text',
            isNullable: true,
          },
          // Webhook Configuration
          {
            name: 'webhookUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'webhookSecret',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'webhookEvents',
            type: 'jsonb',
            default: "'[]'",
            isNullable: false,
          },
          {
            name: 'webhookEnabled',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'webhookLastTested',
            type: 'timestamp',
            isNullable: true,
          },
          // Encryption & Security
          {
            name: 'encryptionStatus',
            type: 'enum',
            enum: ['ENCRYPTED', 'UNENCRYPTED', 'NEEDS_ROTATION'],
            default: "'UNENCRYPTED'",
            isNullable: false,
          },
          {
            name: 'encryptionKeyVersion',
            type: 'int',
            default: 1,
            isNullable: false,
          },
          {
            name: 'credentialsRotatedDate',
            type: 'timestamp',
            isNullable: true,
          },
          // Rate Limits
          {
            name: 'maxDailyCollections',
            type: 'int',
            default: 10000,
            isNullable: false,
          },
          {
            name: 'maxDailyDisbursementAmount',
            type: 'decimal',
            precision: 19,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'maxTransactionAmount',
            type: 'decimal',
            precision: 19,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'approvalThresholdAmount',
            type: 'decimal',
            precision: 19,
            scale: 2,
            isNullable: true,
          },
          // Audit & Timestamps
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'lastUpdatedBy',
            type: 'varchar',
            length: '255',
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
          {
            name: 'deletedAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'merchant_configurations',
      new TableIndex({
        name: 'IDX_merchant_config_tenantId',
        columnNames: ['tenantId'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'merchant_configurations',
      new TableIndex({
        name: 'IDX_merchant_config_kycStatus',
        columnNames: ['kycStatus'],
      }),
    );

    await queryRunner.createIndex(
      'merchant_configurations',
      new TableIndex({
        name: 'IDX_merchant_config_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'merchant_configurations',
      new TableIndex({
        name: 'IDX_merchant_config_isActive',
        columnNames: ['isActive'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('merchant_configurations');
  }
}
