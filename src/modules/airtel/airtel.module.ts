import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AirtelCollectionService } from './collection/airtel-collection.service';
import { AirtelAuthService } from './auth/airtel-auth.service';
import { AirtelSigningService } from './signing/airtel-signing.service';
import { AirtelDisbursementService } from './disbursement/airtel-disbursement.service';

@Module({
  imports: [HttpModule],
  providers: [
    AirtelCollectionService,
    AirtelAuthService,
    AirtelSigningService,
    AirtelDisbursementService,
  ],
  exports: [
    AirtelCollectionService,
    AirtelAuthService,
    AirtelSigningService,
    AirtelDisbursementService,
  ],
})
export class AirtelModule {}
