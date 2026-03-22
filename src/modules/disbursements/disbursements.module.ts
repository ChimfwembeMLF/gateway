import { Module, forwardRef } from '@nestjs/common';
import { DisbursementsController } from './disbursements.controller';
import { DisbursementsService } from './disbursements.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Disbursement } from './entities/disbursement.entity';
import { PawapayModule } from '../pawapay/pawapay.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Disbursement]),
    forwardRef(() => PawapayModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [DisbursementsController],
  providers: [DisbursementsService],
  exports: [DisbursementsService],
})
export class DisbursementsModule {}
