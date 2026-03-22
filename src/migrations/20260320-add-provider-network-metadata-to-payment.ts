import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderNetworkMetadataToPayment20260320 implements MigrationInterface {
  name = 'AddProviderNetworkMetadataToPayment20260320'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "provider" VARCHAR NOT NULL DEFAULT 'PAWAPAY'`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "network" VARCHAR`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "providerTransactionId" VARCHAR`);
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN "metadata" JSONB`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_providerTransactionId" ON "payments" ("providerTransactionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_provider" ON "payments" ("provider")`);
    await queryRunner.query(`CREATE INDEX "IDX_payments_network" ON "payments" ("network")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_payments_network"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_provider"`);
    await queryRunner.query(`DROP INDEX "IDX_payments_providerTransactionId"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "metadata"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "providerTransactionId"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "network"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "provider"`);
  }
}
