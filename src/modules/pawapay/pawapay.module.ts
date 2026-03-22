import { Module, forwardRef } from '@nestjs/common';
import { PawapayWebhooksController } from './pawapay-webhooks.controller';

import { PaymentsModule } from '../payments/payments.module';
import { DisbursementsModule } from '../disbursements/disbursements.module';
import { PawapayService } from './pawapay.service';

@Module({
  imports: [forwardRef(() => PaymentsModule), DisbursementsModule],
  controllers: [PawapayWebhooksController],
  providers: [PawapayService],
  exports: [PawapayService],
})
export class PawapayModule {}
