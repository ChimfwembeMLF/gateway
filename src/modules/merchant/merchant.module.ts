import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MerchantConfiguration } from './entities/merchant-configuration.entity';
import { MerchantConfigurationService } from './services/merchant-configuration.service';
import { MerchantConfigurationController } from './controllers/merchant-configuration.controller';

/**
 * Merchant Configuration Module
 * Manages per-tenant merchant credentials, KYC, and business configuration
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantConfiguration]),
    ConfigModule,
  ],
  providers: [MerchantConfigurationService],
  controllers: [MerchantConfigurationController],
  exports: [MerchantConfigurationService],
})
export class MerchantConfigurationModule {}
