import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApiKeyToTenants1770237000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('tenants');
        if (!tableExists) {
            return; // Skip if table doesn't exist yet
        }

        const columnExists = await queryRunner.hasColumn('tenants', 'apiKey');
        if (columnExists) {
            return; // Skip if column already exists
        }

        // Add apiKey column (nullable initially)
        await queryRunner.query(`
            ALTER TABLE "tenants" 
            ADD COLUMN "apiKey" varchar
        `);

        // Generate API keys for existing tenants
        await queryRunner.query(`
            UPDATE "tenants" 
            SET "apiKey" = 'tenant_' || substr(md5(random()::text || id::text), 1, 32)
            WHERE "apiKey" IS NULL
        `);

        // Make column NOT NULL and UNIQUE
        await queryRunner.query(`
            ALTER TABLE "tenants" 
            ALTER COLUMN "apiKey" SET NOT NULL
        `);

        await queryRunner.query(`
            ALTER TABLE "tenants" 
            ADD CONSTRAINT "UQ_tenants_apiKey" UNIQUE ("apiKey")
        `);

        // Create index for performance (skip if already exists)
        try {
            await queryRunner.query(`
                CREATE INDEX "IDX_tenants_apiKey" 
                ON "tenants" ("apiKey")
            `);
        } catch (error) {
            // Index already exists, skip
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`
            DROP INDEX "IDX_tenants_apiKey"
        `);

        // Drop constraint
        await queryRunner.query(`
            ALTER TABLE "tenants" 
            DROP CONSTRAINT "UQ_tenants_apiKey"
        `);

        // Drop column
        await queryRunner.query(`
            ALTER TABLE "tenants" 
            DROP COLUMN "apiKey"
        `);
    }

}
