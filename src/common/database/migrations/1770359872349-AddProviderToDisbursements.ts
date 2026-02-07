import { MigrationInterface, QueryRunner, TableColumn } from "typeorm"

export class AddProviderToDisbursements1770359872349 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('disbursements');
        if (!tableExists) {
            return; // Skip if table doesn't exist yet
        }

        const columnExists = await queryRunner.hasColumn('disbursements', 'provider');
        if (columnExists) {
            return; // Skip if column already exists
        }

        // Add provider enum type if it doesn't exist
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE payment_provider_enum AS ENUM ('AIRTEL', 'MTN');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // Add provider column to disbursements table
        await queryRunner.addColumn('disbursements', new TableColumn({
            name: 'provider',
            type: 'enum',
            enum: ['AIRTEL', 'MTN'],
            default: "'AIRTEL'",
            isNullable: false,
        }));

        // Create index on provider column for faster filtering
        await queryRunner.query(`
            CREATE INDEX "IDX_disbursements_provider" ON "disbursements" ("provider");
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the index
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_disbursements_provider";`);

        // Drop the provider column
        await queryRunner.dropColumn('disbursements', 'provider');

        // Optionally drop the enum type (commented out to avoid breaking other tables if they use it)
        // await queryRunner.query(`DROP TYPE IF EXISTS payment_provider_enum;`);
    }

}
