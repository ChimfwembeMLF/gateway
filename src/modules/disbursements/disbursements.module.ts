import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Disbursement } from './entities/disbursement.entity';
import { DisbursementsService } from './services/disbursements.service';
import { DisbursementsController } from './controllers/disbursements.controller';
import { DisbursementRepository } from './repositories/disbursement.repository';
import { AirtelModule } from '../airtel/airtel.module';
import { TenantModule } from '../tenant/tenant.module';
import { MtnModule } from '../mtn/mtn.module';
import { DisbursementModule as MtnDisbursementModule } from '../mtn/disbursement/disbursement.module';

/**
 * Disbursements Module
 * Handles disbursement (payout) operations for multiple providers
 * Supports: Airtel Money and MTN Mobile Money
 *
 * Public API:
 * - POST /api/v1/disbursements - Create new disbursement (specify provider)
 * - GET /api/v1/disbursements/{id} - Get disbursement details
 * - GET /api/v1/disbursements - List disbursements for tenant
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Disbursement]),
    AirtelModule,
    TenantModule,
    forwardRef(() => MtnModule),
    forwardRef(() => MtnDisbursementModule),
  ],
  controllers: [DisbursementsController],
  providers: [DisbursementsService, DisbursementRepository],
  exports: [DisbursementsService, DisbursementRepository],
})
export class DisbursementsModule {}
