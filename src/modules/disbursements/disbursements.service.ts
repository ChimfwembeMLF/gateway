import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { WebhookNotificationService } from '../../common/webhook-notification.service';
import { MerchantConfigurationService } from '../merchant/services/merchant-configuration.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { Disbursement } from './entities/disbursement.entity';
// import axios from 'axios';
import { PawapayService } from '../pawapay/pawapay.service';
import { InitiatePayoutDto } from '../pawapay/dtos/initiate-payout.dto';
import { ConfigService } from '@nestjs/config';
import { UuidGeneratorService } from '../payments/external-id.service';
import { normalizeZambiaNetwork } from 'src/common/utils/network-normalizer.util';
import { ZambiaNetwork } from 'src/common/enums/zambia-network.enum';

@Injectable()
export class DisbursementsService {
  private readonly logger = new Logger(DisbursementsService.name);

  constructor(
    @InjectRepository(Disbursement)
    private readonly disbursementRepository: Repository<Disbursement>,
    private readonly configService: ConfigService,
    private readonly pawapayService: PawapayService,
    private readonly uuidGenerator: UuidGeneratorService,
    private readonly merchantConfigService: MerchantConfigurationService,
    private readonly webhookNotificationService: WebhookNotificationService,
  ) {}

  async create(createDisbursementDto: CreateDisbursementDto & { tenantId: string; clientId: string }, user: any): Promise<Disbursement> {
    // Generate payoutId (UUID)
    const payoutId = this.uuidGenerator.generate();
    const normalizedNetwork = normalizeZambiaNetwork(createDisbursementDto.network);

    // Validate and sanitize fields for pawaPay
    const amount = createDisbursementDto.amount
    const currency = typeof createDisbursementDto.currency === 'string' && createDisbursementDto.currency.length === 3
      ? createDisbursementDto.currency.toUpperCase()
      : 'ZMW';
    const phoneNumber = typeof createDisbursementDto.recipient === 'string' && createDisbursementDto.recipient.match(/^\d{9,15}$/)
      ? createDisbursementDto.recipient
      : '260763456789';
    const provider = typeof normalizedNetwork === 'string' && normalizedNetwork.length > 0
      ? normalizedNetwork
      : 'MTN_MOMO_ZMB';
    const orderId = typeof createDisbursementDto.externalId === 'string' && createDisbursementDto.externalId.length > 0
      ? createDisbursementDto.externalId
      : 'ORD-UNKNOWN';
    const customerId = typeof user?.email === 'string' && user.email.length > 0
      ? user.email
      : 'customer@email.com';

    const payoutPayload: any = {
      amount,
      currency,
      payoutId,
      recipient: {
        type: 'MMO',
        accountDetails: {
          provider,
          phoneNumber,
        },
      },
      customerMessage: createDisbursementDto.description || 'Payment',
      metadata: [
        { orderId },
        { customerId, isPII: true },
      ],
    };
    this.logger.debug('[pawaPay InitiatePayoutDto payload]', JSON.stringify(payoutPayload));
    let providerResult: any;
    try {
      providerResult = await this.pawapayService.initiatePayout(payoutPayload);
    } catch (error) {
      this.logger.error('pawaPay disbursement API error', error?.response?.data || error.message);
      throw new InternalServerErrorException('Failed to initiate disbursement with pawaPay');
    }
    // Save disbursement record with payoutId
    const disbursement = this.disbursementRepository.create({
      // Explicitly set all not-null columns
      tenantId: createDisbursementDto.tenantId || user?.tenantId || 'UNKNOWN_TENANT',
      clientId: createDisbursementDto.clientId || user?.clientId || 'UNKNOWN_CLIENT',
      externalId: createDisbursementDto.externalId || payoutId,
      amount: amount,
      currency: currency,
      recipient: phoneNumber,
      provider: createDisbursementDto.provider || 'PAWAPAY',
      network: (normalizedNetwork as ZambiaNetwork),
      status: providerResult?.status || 'PENDING',
      // Optionally set nullable columns
      payoutId,
      description: createDisbursementDto.description,
      recipientName: createDisbursementDto.recipientName,
      transactionId: providerResult?.transactionId ?? null,
      errorCode: providerResult?.errorCode ?? null,
      errorMessage: providerResult?.errorMessage ?? null,
      completedAt: providerResult?.completedAt ?? null,
    });
    const saved = await this.disbursementRepository.save(disbursement);
    // Notify tenant webhook for payout.created
    try {
      const config = await this.merchantConfigService.findByTenantId(disbursement.tenantId);
      if (config?.webhookUrl && config?.webhookEnabled && config?.webhookEvents?.includes('payout.created')) {
        await this.webhookNotificationService.notifyWebhook(
          config.webhookUrl,
          'payout.created',
          { payout: saved },
          config.webhookSecret,
        );
      }
    } catch (err) {
      this.logger.warn(`Could not notify tenant webhook: ${err.message}`);
    }
    return saved;
  }

async findAll({ clientId }: { clientId?: string }, req: any): Promise<Disbursement[]> {
  const tenantId = req?.tenant?.id || req?.user?.tenantId || req?.user?.tenant?.id;
  if (!tenantId) throw new Error('Missing tenantId');
  const where: any = { tenantId };
  if (clientId) where.clientId = clientId;
  return this.disbursementRepository.find({ where, order: { createdAt: 'DESC' } });
}

  async updateStatus(id: string, status: string): Promise<Disbursement> {
    const disbursement = await this.disbursementRepository.findOne({ where: { externalId: id } });
    if (!disbursement) {
      throw new Error('Disbursement not found');
    }
    disbursement.status = status;
    const updated = await this.disbursementRepository.save(disbursement);
    // Notify tenant webhook for payout.status
    try {
      const config = await this.merchantConfigService.findByTenantId(disbursement.tenantId);
      if (config?.webhookUrl && config?.webhookEnabled && config?.webhookEvents?.includes('payout.status')) {
        await this.webhookNotificationService.notifyWebhook(
          config.webhookUrl,
          'payout.status',
          { payout: updated },
          config.webhookSecret,
        );
      }
    } catch (err) {
      this.logger.warn(`Could not notify tenant webhook: ${err.message}`);
    }
    return updated;
  }

    async getById(id: string, req: any): Promise<Disbursement | null> {
    const tenantId = req?.tenant?.id || req?.user?.tenantId || req?.user?.tenant?.id;
    if (!tenantId) throw new Error('Missing tenantId');
    return this.disbursementRepository.findOne({ where: { id, tenantId } });
  }


  async initiateBulkPayouts(dto: any) {
    try {
      return await this.pawapayService.initiateBulkPayouts(dto);
    } catch (error) {
      const failureCode = error?.response?.data?.failureCode;
      const failureMessage = error?.response?.data?.failureMessage || error?.response?.data?.message;
      if (failureCode) {
        throw new InternalServerErrorException(`pawaPay error [${failureCode}]: ${failureMessage || 'No message provided.'}`);
      }
      throw error;
    }
  }

  async checkPayoutStatus(dto: any) {
    try {
      return await this.pawapayService.checkPayoutStatus(dto);
    } catch (error) {
      const failureCode = error?.response?.data?.failureCode;
      const failureMessage = error?.response?.data?.failureMessage || error?.response?.data?.message;
      if (failureCode) {
        throw new InternalServerErrorException(`pawaPay error [${failureCode}]: ${failureMessage || 'No message provided.'}`);
      }
      throw error;
    }
  }

  async resendPayoutCallback(dto: any) {
    try {
      return await this.pawapayService.resendPayoutCallback(dto);
    } catch (error) {
      const failureCode = error?.response?.data?.failureCode;
      const failureMessage = error?.response?.data?.failureMessage || error?.response?.data?.message;
      if (failureCode) {
        throw new InternalServerErrorException(`pawaPay error [${failureCode}]: ${failureMessage || 'No message provided.'}`);
      }
      throw error;
    }
  }

  async cancelEnqueuedPayout(dto: any) {
    try {
      return await this.pawapayService.cancelEnqueuedPayout(dto);
    } catch (error) {
      const failureCode = error?.response?.data?.failureCode;
      const failureMessage = error?.response?.data?.failureMessage || error?.response?.data?.message;
      if (failureCode) {
        throw new InternalServerErrorException(`pawaPay error [${failureCode}]: ${failureMessage || 'No message provided.'}`);
      }
      throw error;
    }
  }
}
