import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuditTenantId1770236876435 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {

        const tableExists = await queryRunner.hasTable('audits');
        if (!tableExists) {
            return; // Skip if table doesn't exist yet
        }

        const columnExists = await queryRunner.hasColumn('audits', 'tenantId');
        if (columnExists) {
            return; // Skip if column already exists
        }

        // Add tenantId column (nullable initially)
        await queryRunner.query(`
            ALTER TABLE "audits" 
            ADD COLUMN "tenantId" uuid
        `);

        // Backfill existing records with 'SYSTEM' tenant
        await queryRunner.query(`
            UPDATE "audits" 
            SET "tenantId" = '00000000-0000-0000-0000-000000000000'
            WHERE "tenantId" IS NULL
        `);

        // Make column NOT NULL
        await queryRunner.query(`
            ALTER TABLE "audits" 
            ALTER COLUMN "tenantId" SET NOT NULL
        `);

        // Create index for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_audits_tenantId" 
            ON "audits" ("tenantId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`
            DROP INDEX "IDX_audits_tenantId"
        `);

        // Drop column
        await queryRunner.query(`
            ALTER TABLE "audits" 
            DROP COLUMN "tenantId"
        `);
    }

}
