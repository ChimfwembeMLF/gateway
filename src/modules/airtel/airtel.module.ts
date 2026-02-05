import { Module } from '@nestjs/common';
import { AirtelCollectionService } from './collection/airtel-collection.service';
import { AirtelAuthService } from './auth/airtel-auth.service';
import { AirtelSigningService } from './signing/airtel-signing.service';

@Module({
  providers: [
    AirtelCollectionService,
    AirtelAuthService,
    AirtelSigningService,
  ],
  exports: [AirtelCollectionService],
})
export class AirtelModule {}
